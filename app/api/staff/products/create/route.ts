import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "../../_guard";
import { createPage, DB } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/staff/products/create
 * 在 DB07 建一筆新商品，同時寫進 Supabase products（status=draft、發佈狀態=待發佈）
 *
 * Body:
 *   sku       : string  必填，商品 ID（多半是 ISBN-13，掃條碼自動帶入）
 *   name      : string  必填，商品名稱
 *   price     : number  必填，售價
 *   photoUrl  : string  必填，已經上傳到 Cloudinary 的圖片 URL
 *   authorId    : string  選填，DB08 person notion_id（作者）
 *   publisherId : string  選填，DB08 person notion_id（出版發行）
 *   subCategory : "選書"|"選物"|"數位"  選填，沒給則由 sku 自動判斷（978/979 = 選書）
 *
 * 回傳：{ id, notion_id, name, price, sku }
 */
export async function POST(req: NextRequest) {
  const guard = await requireStaff(req);
  if ("error" in guard) return guard.error;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sku, name, price, photoUrl, authorId, publisherId, authorName, publisherName } = body || {};
  let { subCategory } = body || {};

  // ── 驗證必填 ──
  if (!sku || typeof sku !== "string") {
    return NextResponse.json({ error: "缺少 sku（商品 ID）" }, { status: 400 });
  }
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "缺少 name（商品名稱）" }, { status: 400 });
  }
  if (typeof price !== "number" || price < 0) {
    return NextResponse.json({ error: "price 必須為非負數字" }, { status: 400 });
  }
  if (!photoUrl || typeof photoUrl !== "string") {
    return NextResponse.json({ error: "缺少 photoUrl（商品照片 URL）" }, { status: 400 });
  }

  // ── 自動判斷商品選項：ISBN-13（978/979 開頭）= 選書 ──
  if (!subCategory) {
    if (/^97[89]\d{10}$/.test(sku)) subCategory = "選書";
    else subCategory = "選物"; // fallback
  }

  // ── 重複檢查：相同 sku 已存在就不建（避免同事各自掃出重複的 page）──
  try {
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id, notion_id, name, price")
      .eq("sku", sku)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        product: existing,
        message: "此 SKU 已存在，直接回傳既有商品",
      });
    }
  } catch {
    // 查不到就繼續往下建
  }

  // ── 作者／出版發行：找不到就自動在 DB08 建一筆最簡 page（只填名稱，其他欄位 Noah 之後歸檔）──
  let resolvedAuthorId: string | undefined = authorId || undefined;
  let resolvedPublisherId: string | undefined = publisherId || undefined;

  if (!resolvedAuthorId && typeof authorName === "string" && authorName.trim()) {
    try {
      const newAuthor = await createPage(DB.DB08_RELATIONSHIP, {
        "經營名稱": { title: [{ text: { content: authorName.trim() } }] },
      });
      resolvedAuthorId = newAuthor.id;
    } catch (err: any) {
      console.error("[products/create] auto-create author failed:", err?.message);
      // 失敗就不帶 author，繼續建 DB07 主商品
    }
  }

  if (!resolvedPublisherId && typeof publisherName === "string" && publisherName.trim()) {
    try {
      const newPub = await createPage(DB.DB08_RELATIONSHIP, {
        "經營名稱": { title: [{ text: { content: publisherName.trim() } }] },
      });
      resolvedPublisherId = newPub.id;
    } catch (err: any) {
      console.error("[products/create] auto-create publisher failed:", err?.message);
    }
  }

  // ── 1. 寫 Notion DB07 ──
  const notionProps: Record<string, any> = {
    "庫存名稱": { title: [{ text: { content: name } }] },
    "商品ID": { rich_text: [{ text: { content: sku } }] },
    "庫存售價": { number: price },
    "庫存類型": { select: { name: "商品" } },
    "商品選項": { select: { name: subCategory } },
    "發佈狀態": { status: { name: "待發佈" } },
    "產品照片": {
      files: [
        {
          name: `${sku}.jpg`,
          type: "external",
          external: { url: photoUrl },
        },
      ],
    },
  };

  if (resolvedAuthorId) {
    notionProps["對應作者"] = { relation: [{ id: resolvedAuthorId }] };
  }
  if (resolvedPublisherId) {
    notionProps["對應發行"] = { relation: [{ id: resolvedPublisherId }] };
  }

  let notionPage: any;
  try {
    notionPage = await createPage(DB.DB07_INVENTORY, notionProps);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Notion DB07 建立失敗：" + (err?.message || String(err)) },
      { status: 500 }
    );
  }

  const notionId = notionPage.id.replace(/-/g, "");

  // ── 2. 反查 author/publisher 在 Supabase persons 表的 UUID ──
  // 注意：自動建檔的 DB08 page 沒設「會員狀態=會員 + 關係選項=個人」，
  // 不會被 sync 到 Supabase persons 表。所以新建的 author/publisher 在這裡會是 null，
  // 等 Noah 在 Notion 補齊欄位、下次 sync 後才會在 Supabase 出現。
  let supaAuthorId: string | null = null;
  let supaPublisherId: string | null = null;
  if (resolvedAuthorId) {
    const cleanAuthor = resolvedAuthorId.replace(/-/g, "");
    const { data } = await supabaseAdmin
      .from("persons")
      .select("id")
      .eq("notion_id", cleanAuthor)
      .maybeSingle();
    supaAuthorId = data?.id || null;
  }
  if (resolvedPublisherId) {
    const cleanPub = resolvedPublisherId.replace(/-/g, "");
    const { data } = await supabaseAdmin
      .from("persons")
      .select("id")
      .eq("notion_id", cleanPub)
      .maybeSingle();
    supaPublisherId = data?.id || null;
  }

  // ── 3. 寫 Supabase products（status=draft，符合「發佈狀態=待發佈」）──
  const supaRow = {
    notion_id: notionId,
    sku,
    name,
    category: `商品/${subCategory}`,
    price,
    stock: 0, // 新商品無庫存，由 DB06 進貨累加
    images: JSON.stringify(photoUrl ? [photoUrl] : []),
    author_id: supaAuthorId,
    publisher_id: supaPublisherId,
    sub_category: subCategory,
    status: "draft", // 待發佈，官網不顯示
    page_status: "無頁面",
  };

  const { data: inserted, error: supaErr } = await supabaseAdmin
    .from("products")
    .insert(supaRow)
    .select("id, notion_id, name, price, sku")
    .single();

  if (supaErr) {
    // Notion 已建但 Supabase 失敗 — 回傳警告，但仍給 client 用 Notion 資料運作
    return NextResponse.json({
      ok: true,
      partial: true,
      product: {
        id: null,
        notion_id: notionId,
        name,
        price,
        sku,
      },
      warning: "Notion 已建，但 Supabase 同步失敗：" + supaErr.message,
    });
  }

  return NextResponse.json({
    ok: true,
    product: inserted,
  });
}
