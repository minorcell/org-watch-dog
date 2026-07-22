import { NextResponse } from "next/server";

import { getCronSecret } from "@/lib/env";
import { fetchRepoMetadata } from "@/lib/github";
import { collectStarSnapshots } from "@/lib/stars";
import { getTrackedRepos, syncRepoMetadata } from "@/lib/database";
import { runScheduler, type ScheduledTask } from "@/lib/scheduler";

export async function GET(request: Request) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    return NextResponse.json({ message: "CRON_SECRET 尚未配置" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "未授权" }, { status: 401 });
  }

  const tasks: ScheduledTask[] = [
    // Task 1: Sync repo metadata from GitHub
    {
      name: "sync-repo-metadata",
      run: async () => {
        const repos = await getTrackedRepos();
        if (repos.length === 0) return { ok: true, message: "没有需要同步的仓库" };

        let synced = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const repo of repos) {
          try {
            const [owner, name] = repo.githubRepo.split("/");
            const meta = await fetchRepoMetadata(owner, name);
            await syncRepoMetadata(repo.githubRepo, meta);
            synced++;
          } catch (err) {
            failed++;
            errors.push(`${repo.githubRepo}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        return {
          ok: failed === 0,
          message: `同步 ${synced} 个仓库元信息` + (failed > 0 ? `，${failed} 个失败` : ""),
          detail: errors.length > 0 ? errors.slice(0, 5) : undefined,
        };
      },
    },

    // Task 2: Collect star snapshots
    {
      name: "collect-star-snapshots",
      run: async () => {
        const result = await collectStarSnapshots();
        return {
          ok: result.failed === 0,
          message: `采集 ${result.saved} 个仓库 Star 快照` + (result.failed > 0 ? `，${result.failed} 个失败` : ""),
          detail: result.failed > 0 ? result.errors.slice(0, 5) : undefined,
        };
      },
    },
  ];

  const results = await runScheduler(tasks);
  const hasFailure = results.some((r) => !r.ok);
  console.log("[cron]", JSON.stringify(results));
  return NextResponse.json({ tasks: results }, { status: hasFailure ? 500 : 200 });
}
