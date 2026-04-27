import { NextResponse } from "next/server";
import { requireStaff } from "../_guard";
import { getNotionUserId } from "@/lib/notion-users";
import { fetchTasksFromNotion } from "@/lib/staff-tasks";

const cache: Record<string, { data: any; time: number }> = {};
const CACHE_TTL = 30_000;

export async function GET(req: Request) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;
  const email = guard.email || "";
  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  if (!force && cache[email] && Date.now() - cache[email].time < CACHE_TTL) {
    return NextResponse.json(cache[email].data);
  }

  const notionUserId = await getNotionUserId(email);
  if (!notionUserId) {
    const empty = { tree: [], orphanTasks: [], orphanDetails: [], counts: { db03: 0, db04: 0, db05: 0 }, message: "此帳號尚未在 Notion 中被指派任務" };
    cache[email] = { data: empty, time: Date.now() };
    return NextResponse.json(empty);
  }
  try {
    const data = await fetchTasksFromNotion(notionUserId);
    cache[email] = { data, time: Date.now() };
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[staff/tasks] error:", err.message);
    return NextResponse.json({ error: "查詢待辦失敗：" + err.message }, { status: 500 });
  }
}
