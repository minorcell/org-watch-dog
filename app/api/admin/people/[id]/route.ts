import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { deletePerson, updatePerson } from "@/lib/database";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const { id } = await params;
  const { githubId, realName } = await request.json();
  if (!githubId?.trim() || !realName?.trim()) {
    return NextResponse.json({ message: "GitHub ID 和真实姓名不能为空" }, { status: 400 });
  }
  const person = await updatePerson(Number(id), githubId.trim(), realName.trim());
  if (!person) return NextResponse.json({ message: "人员不存在" }, { status: 404 });
  return NextResponse.json(person);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const { id } = await params;
  const ok = await deletePerson(Number(id));
  if (!ok) return NextResponse.json({ message: "人员不存在" }, { status: 404 });
  return NextResponse.json({ success: true });
}
