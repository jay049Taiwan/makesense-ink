import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";
import { fetchPersonByEmail } from "@/lib/fetch-all";
import { updatePage } from "@/lib/notion";

export async function GET() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select("id, email, name, phone, line_uid, notify_line, notify_email")
    .eq("email", email)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
  if (!member) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });

  return NextResponse.json({
    id: member.id,
    email: member.email,
    name: member.name || "",
    phone: member.phone || "",
    lineUid: member.line_uid || "",
    notifyLine: member.notify_line ?? true,
    notifyEmail: member.notify_email ?? true,
    role: (session as any)?.role || "member",
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ ok: false, error: "未登入" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, any> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.phone === "string") updates.phone = body.phone.trim();
  if (typeof body.notifyLine === "boolean") updates.notify_line = body.notifyLine;
  if (typeof body.notifyEmail === "boolean") updates.notify_email = body.notifyEmail;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "沒有可更新欄位" }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("members")
    .update(updates)
    .eq("email", email)
    .select("id, email, phone");

  if (error) {
    console.error("[profile PATCH] supabase error:", error, "email=", email);
    return NextResponse.json({ ok: false, error: "儲存失敗" }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    console.error("[profile PATCH] no rows updated, email=", email, "updates=", updates);
    return NextResponse.json({ ok: false, error: `找不到會員 (${email})` }, { status: 404 });
  }
  console.log("[profile PATCH] updated", updated.length, "rows for", email);

  // 同步寫回 Notion DB08（失敗不影響回應）
  try {
    const person = await fetchPersonByEmail(email);
    if (person) {
      const notionUpdates: Record<string, any> = {};
      if (typeof body.phone === "string") {
        notionUpdates["電話"] = { rich_text: [{ text: { content: body.phone.trim() } }] };
      }
      if (typeof body.name === "string" && body.name.trim()) {
        notionUpdates["經營名稱"] = { title: [{ text: { content: body.name.trim() } }] };
      }
      if (Object.keys(notionUpdates).length > 0) {
        await updatePage(person.id, notionUpdates);
      }
    }
  } catch (e) {
    console.error("DB08 profile sync failed:", e);
  }

  return NextResponse.json({ ok: true });
}
