import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { fetchRepoMetadata } from "@/lib/github";
import { runScheduler } from "@/lib/scheduler";
import { collectStarSnapshots } from "@/lib/stars";
import { getTrackedRepos, syncRepoMetadata } from "@/lib/database";

export async function POST() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  try {
    const results = await runScheduler([
      {
        name: "sync-repo-metadata",
        run: async () => {
          const repos = await getTrackedRepos();
          let synced = 0;
          for (const repo of repos) {
            try {
              const [owner, name] = repo.githubRepo.split("/");
              const meta = await fetchRepoMetadata(owner, name);
              await syncRepoMetadata(repo.githubRepo, meta);
              synced++;
            } catch { /* skip individual failures */ }
          }
          return { ok: true, message: `同步 ${synced} 个仓库元信息` };
        },
      },
      {
        name: "collect-star-snapshots",
        run: async () => {
          const result = await collectStarSnapshots();
          return {
            ok: true,
            message: `采集 ${result.saved} 个仓库` + (result.failed > 0 ? `，${result.failed} 个失败` : ""),
          };
        },
      },
    ]);

    const snapshotResult = results[1];
    const savedMsg = snapshotResult?.message ?? "完成";
    return NextResponse.json({ message: savedMsg, tasks: results });
  } catch (error) {
    console.error("Manual sync failed", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "同步失败" },
      { status: 503 },
    );
  }
}
