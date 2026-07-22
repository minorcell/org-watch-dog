import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createPerson, listPeople } from "@/lib/database";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const people = await listPeople();
  return NextResponse.json(people);
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "未登录" }, { status: 401 });
  const { githubId, realName } = await request.json();
  if (!githubId?.trim() || !realName?.trim()) {
    return NextResponse.json({ message: "GitHub ID 和真实姓名不能为空" }, { status: 400 });
  }
  try {
    const person = await createPerson(githubId.trim(), realName.trim());
    return NextResponse.json(person, { status: 201 });
  } catch {
    return NextResponse.json({ message: "该 GitHub ID 已存在" }, { status: 409 });
  }
}
