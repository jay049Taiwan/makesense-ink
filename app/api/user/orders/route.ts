export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { fetchRegistrationsByNotionId } from "@/lib/fetch-all";
import { NextResponse } from "next/server";

// GET /api/user/orders — 讀取 DB05 該會員的報名紀錄
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const notionId = (session as any).notionId;
  if (!notionId) return NextResponse.json({ registrations: [] });

  const registrations = await fetchRegistrationsByNotionId(notionId, 50);
  return NextResponse.json({ registrations });
}
