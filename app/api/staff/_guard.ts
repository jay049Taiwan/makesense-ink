import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireStaff() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "未登入" }, { status: 401 }) };
  }
  if ((session as any).role !== "staff") {
    return { error: NextResponse.json({ error: "非工作人員" }, { status: 403 }) };
  }
  return { session, email: session.user.email };
}
