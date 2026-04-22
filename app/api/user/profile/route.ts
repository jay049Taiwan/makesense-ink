export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { queryDatabase, updatePage, extractTitle, extractText, extractSelect, DB } from "@/lib/notion";
import { NextResponse } from "next/server";

async function getNotionPage(email: string, lineUid?: string) {
  if (email) {
    const rows = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "Email", rich_text: { equals: email.toLowerCase().trim() } },
      undefined, 1
    );
    if (rows.length > 0) return rows[0] as any;
  }
  if (lineUid) {
    const rows = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "LINE_UID", rich_text: { equals: lineUid.trim() } },
      undefined, 1
    );
    if (rows.length > 0) return rows[0] as any;
  }
  return null;
}

// GET /api/user/profile — 讀取 DB08 個人資料
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const email = session.user.email ?? "";
  const page = await getNotionPage(email);
  if (!page) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });

  const props = page.properties;
  return NextResponse.json({
    id: page.id,
    name:    extractTitle(props["經營名稱"]?.title),
    email:   extractText(props["Email"]?.rich_text),
    phone:   extractText(props["電話"]?.rich_text),  // 2026/04/17：原「聯繫電話」不存在，改用「電話」
    summary: extractText(props["簡介摘要"]?.rich_text),
    role:    extractSelect(props["關係選項"]?.select) || "一般會員",
    lineUid: extractText(props["LINE_UID"]?.rich_text),
    // 通知設定預設值（DB08 目前無 通知_LINE / 通知_Email checkbox 欄位，需新增後才能個別關閉）
    // TODO: 在 DB08 建立 checkbox 欄位「通知_LINE」「通知_Email」後改讀取 props["通知_LINE"]?.checkbox
    notifyLine:  true,
    notifyEmail: true,
  });
}

// PATCH /api/user/profile — 更新 DB08
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const email = session.user.email ?? "";
  const page = await getNotionPage(email);
  if (!page) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });

  const { name, phone, summary } = await req.json() as any;
  // notifyLine / notifyEmail 目前 DB08 無對應 checkbox 欄位，忽略寫入（見 GET handler 的 TODO）

  const properties: Record<string, any> = {};
  if (name !== undefined)
    properties["經營名稱"] = { title: [{ text: { content: String(name) } }] };
  if (phone !== undefined)
    properties["電話"] = { rich_text: [{ text: { content: String(phone) } }] };  // 2026/04/17：原「聯繫電話」不存在
  if (summary !== undefined)
    properties["簡介摘要"] = { rich_text: [{ text: { content: String(summary) } }] };

  await updatePage(page.id, properties);
  return NextResponse.json({ ok: true });
}
