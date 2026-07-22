import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { importOrgFromYaml } from "@/lib/database";
import { getWatchConfig } from "@/lib/watch-config";

export async function POST() {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  try {
    const config = await getWatchConfig();
    const result = await importOrgFromYaml(config.groups.map((g) => ({
      githubRepo: (() => {
        if (!g.github_repo) return "";
        const url = new URL(g.github_repo);
        const parts = url.pathname.split("/").filter(Boolean);
        return `${parts[0]}/${parts[1]}`;
      })(),
      mentor: g.mentor,
      assistant: g.assistant,
      members: g.members,
    })));
    return NextResponse.json({ message: `导入 ${result.repos} 个仓库，${result.people} 人`, ...result });
  } catch (error) {
    return NextResponse.json({ message: "导入失败", error: String(error) }, { status: 500 });
  }
}
