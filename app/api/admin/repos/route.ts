import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { listRepos, upsertRepo, setRepoMember, removeRepoMember, getRepoDetail } from "@/lib/database";

export async function GET(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });

  // ?detail=1024XEngineer/Windup
  const detailRepo = request.nextUrl.searchParams.get("detail");
  if (detailRepo) {
    const detail = await getRepoDetail(detailRepo);
    if (!detail) return NextResponse.json({ message: "仓库不存在" }, { status: 404 });
    return NextResponse.json(detail);
  }

  const repos = await listRepos();
  return NextResponse.json(repos);
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const { githubRepo, members } = await request.json();

  if (!githubRepo?.trim()) {
    return NextResponse.json({ message: "GitHub 仓库不能为空" }, { status: 400 });
  }

  const repo = await upsertRepo(githubRepo.trim());

  // Assign members
  if (Array.isArray(members)) {
    for (const m of members) {
      if (m.personId && m.role) {
        await setRepoMember(repo.id, m.personId, m.role);
      }
    }
  }

  const detail = await getRepoDetail(repo.githubRepo);
  return NextResponse.json(detail, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const { githubRepo, members } = await request.json();

  if (!githubRepo?.trim()) {
    return NextResponse.json({ message: "GitHub 仓库不能为空" }, { status: 400 });
  }

  const repo = await upsertRepo(githubRepo.trim());

  // Replace members
  const detail = await getRepoDetail(repo.githubRepo);
  if (detail) {
    for (const m of detail.members) {
      await removeRepoMember(repo.id, m.personId);
    }
  }
  if (Array.isArray(members)) {
    for (const m of members) {
      if (m.personId && m.role) {
        await setRepoMember(repo.id, m.personId, m.role);
      }
    }
  }

  const updated = await getRepoDetail(repo.githubRepo);
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const githubRepo = request.nextUrl.searchParams.get("repo");
  if (!githubRepo) return NextResponse.json({ message: "缺少 repo 参数" }, { status: 400 });

  const { deleteRepo } = await import("@/lib/database");
  const detail = await getRepoDetail(githubRepo);
  if (!detail) return NextResponse.json({ message: "仓库不存在" }, { status: 404 });

  const ok = await deleteRepo(detail.id);
  if (!ok) return NextResponse.json({ message: "删除失败" }, { status: 500 });
  return NextResponse.json({ success: true });
}
