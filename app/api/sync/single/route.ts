import { NextRequest, NextResponse } from "next/server";
import { getPage, extractTitle, extractText, extractSelect, extractDate, extractRelation, extractNumber, extractStatus, extractUrl } from "@/lib/notion";
import { supabase } from "@/lib/supabase";

export const maxDuration = 30;

/**
 * POST /api/sync/single — 單筆 Notion → Supabase 同步
 * Body: { pageId: string, db: "DB04" | "DB05" | "DB06" | "DB07" | "DB08" }
 * 或 query: ?pageId=xxx&db=DB07
 */
export async function POST(req: NextRequest) {
  try {
    // 支援 JSON body 或 query params
    let pageId: string | null = null;
    let db: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      pageId = body.pageId || body.page_id;
      db = body.db || body.database;
    }
    // query params 優先
    pageId = req.nextUrl.searchParams.get("pageId") || pageId;
    db = req.nextUrl.searchParams.get("db") || db;

    if (!pageId || !db) {
      return NextResponse.json({ error: "Missing pageId or db parameter" }, { status: 400 });
    }

    // 正規化 pageId（移除橫線）
    const cleanId = pageId.replace(/-/g, "");

    // 取得 Notion 頁面
    const page = await getPage(pageId);
    const props: Record<string, any> = (page as any).properties || {};

    let result: any = null;

    switch (db.toUpperCase()) {
      case "DB04":
        result = await syncSingleEvent(cleanId, props);
        break;
      case "DB05":
        result = await syncSingleArticle(cleanId, props);
        break;
      case "DB06":
        result = await syncSingleTransaction(cleanId, props);
        break;
      case "DB07":
        result = await syncSingleProduct(cleanId, props);
        break;
      case "DB08":
        result = await syncSingleRelation(cleanId, props);
        break;
      default:
        return NextResponse.json({ error: `Unknown db: ${db}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, db, pageId: cleanId, result });
  } catch (err: any) {
    console.error("Single sync error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── Helpers ──
function t(prop: any) { return extractTitle(prop?.title) || ""; }
function tx(prop: any) { return extractText(prop?.rich_text) || null; }
function sel(prop: any) { return extractSelect(prop?.select) || null; }
function st(prop: any) { return extractStatus(prop?.status) || null; }
function num(prop: any) { return extractNumber(prop?.number); }
function rel(prop: any) { return extractRelation(prop?.relation); }
function dt(prop: any) { return extractDate(prop?.date); }
function url(prop: any) { return extractUrl(prop?.url) || null; }

function fileUrl(prop: any): string | null {
  const files = prop?.files || prop;
  if (!files || !Array.isArray(files) || files.length === 0) return null;
  return files[0]?.file?.url || files[0]?.external?.url || null;
}

function fileUrls(prop: any): string[] {
  const files = prop?.files || prop;
  if (!files || !Array.isArray(files)) return [];
  return files.map((f: any) => f?.file?.url || f?.external?.url).filter(Boolean);
}

function mapStatus(val: string | null, map: Record<string, string>): string {
  if (!val) return "draft";
  return map[val] || "draft";
}

async function lookupPersonName(notionId: string): Promise<string | null> {
  if (!notionId) return null;
  const clean = notionId.replace(/-/g, "");
  const { data } = await supabase.from("persons").select("name").eq("notion_id", clean).maybeSingle();
  return data?.name || null;
}

// ── DB04 → events ──
async function syncSingleEvent(nid: string, props: any) {
  const dateInfo = dt(props["執行時間"]);

  // 對應地點、對應對象 relation → persons name
  const locRels = rel(props["對應地點"]);
  const guideRels = rel(props["對應對象"]);
  const locationName = locRels[0] ? await lookupPersonName(locRels[0]) : null;
  const guideName = guideRels[0] ? await lookupPersonName(guideRels[0]) : null;

  const row = {
    notion_id: nid,
    title: t(props["交接名稱"]) || "未命名活動",
    theme: sel(props["活動類型"]),
    event_type: sel(props["活動類型"]),
    event_date: dateInfo.start || null,
    price: num(props["實際單價"]) || num(props["預計單價"]) || 0,
    capacity: num(props["數量上限"]),
    cover_url: fileUrl(props["上傳檔案"]),
    description: tx(props["簡介摘要"]),
    location: locationName,
    guide: guideName,
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "draft", "不發佈": "inactive" }),
  };
  const { error } = await supabase.from("events").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`events upsert: ${error.message}`);
  return { table: "events", title: row.title, status: row.status };
}

// ── DB05 → articles ──
async function syncSingleArticle(nid: string, props: any) {
  const dateInfo = dt(props["執行時間"]);
  // 對應協作 relation → events
  const eRels = rel(props["對應協作"]);
  let relatedEventId: string | null = null;
  if (eRels[0]) {
    const eClean = eRels[0].replace(/-/g, "");
    const { data } = await supabase.from("events").select("id").eq("notion_id", eClean).maybeSingle();
    relatedEventId = data?.id || null;
  }

  const row = {
    notion_id: nid,
    title: t(props["表單名稱"]) || "未命名文章",
    cover_url: fileUrl(props["上傳檔案"]),
    related_event_id: relatedEventId,
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "published", "發佈更新": "published", "已完成": "published", "待發佈": "draft", "無發佈": "draft" }),
    published_at: dateInfo.start || null,
  };
  const { error } = await supabase.from("articles").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`articles upsert: ${error.message}`);
  return { table: "articles", title: row.title, status: row.status };
}

// ── DB06 → order_items (進銷明細) ──
async function syncSingleTransaction(nid: string, props: any) {
  // DB06 的同步邏輯較特殊，目前先記錄 log
  // TODO: 完善 DB06 → order_items 的欄位對應
  return { table: "order_items", note: "DB06 單筆同步待完善", nid };
}

// ── DB07 → products ──
async function syncSingleProduct(nid: string, props: any) {
  // 反查 author / publisher
  const authorRels = rel(props["對應作者"]);
  const pubRels = rel(props["對應發行"]);

  let authorId: string | null = null;
  let publisherId: string | null = null;

  if (authorRels[0]) {
    const clean = authorRels[0].replace(/-/g, "");
    const { data } = await supabase.from("persons").select("id").eq("notion_id", clean).maybeSingle();
    authorId = data?.id || null;
  }
  if (pubRels[0]) {
    const clean = pubRels[0].replace(/-/g, "");
    const { data } = await supabase.from("persons").select("id").eq("notion_id", clean).maybeSingle();
    publisherId = data?.id || null;
  }

  const cat = sel(props["庫存類型"]) || "";
  const sub = sel(props["商品選項"]) || "";

  const row = {
    notion_id: nid,
    sku: tx(props["商品ID"]),
    name: t(props["庫存名稱"]) || "未命名",
    category: sub ? `${cat}/${sub}` : cat,
    price: num(props["庫存售價"]) || 0,
    stock: num(props["庫存總計"]) || 0,
    description: tx(props["簡介摘要"]),
    images: JSON.stringify(fileUrls(props["產品照片"])),
    author_id: authorId,
    publisher_id: publisherId,
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "進行中": "draft", "待發佈": "draft" }),
  };
  const { error } = await supabase.from("products").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`products upsert: ${error.message}`);
  return { table: "products", title: row.name, status: row.status };
}

// ── DB08 → persons / topics / partners / members / staff ──
async function syncSingleRelation(nid: string, props: any) {
  const type = sel(props["經營類型"]);
  const objectType = sel(props["對象選項"]);
  const status = mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "已完成": "active", "待發佈": "draft", "不發佈": "inactive" });

  // 根據「經營類型」決定寫入哪張表
  if (type === "主題標籤") {
    const row = {
      notion_id: nid,
      name: t(props["經營名稱"]) || "未命名",
      tag_type: mapStatus(st(props["觀點狀態"]), { "標籤": "tag", "觀點": "viewpoint" }) || "tag",
      summary: tx(props["簡介摘要"]),
      status,
    };
    const { error } = await supabase.from("topics").upsert(row, { onConflict: "notion_id" });
    if (error) throw new Error(`topics upsert: ${error.message}`);
    return { table: "topics", title: row.name, status };
  }

  if (type === "連結對象") {
    // 合作單位 → partners
    if (objectType === "合作夥伴") {
      const row = {
        notion_id: nid,
        type: sel(props["單位選項"]) || "民間單位",
        name: t(props["經營名稱"]) || "未命名",
        contact: {
          email: tx(props["Email"]),
          phone: tx(props["電話"]),
          address: tx(props["地址"]),
          contactPerson: tx(props["聯絡人"]),
        },
        status,
      };
      const { error } = await supabase.from("partners").upsert(row, { onConflict: "notion_id" });
      if (error) throw new Error(`partners upsert: ${error.message}`);
      return { table: "partners", title: row.name, status };
    }

    // 工作團隊 → staff
    if (objectType === "工作團隊") {
      const row = {
        notion_id: nid,
        name: t(props["經營名稱"]) || "未命名",
        role: sel(props["職級細項"]),
      };
      const { error } = await supabase.from("staff").upsert(row, { onConflict: "notion_id" });
      if (error) throw new Error(`staff upsert: ${error.message}`);
      return { table: "staff", title: row.name, status: "active" };
    }

    // 其他連結對象 → persons
    const row = {
      notion_id: nid,
      type: objectType || "個人",
      name: t(props["經營名稱"]) || "未命名",
      bio: tx(props["簡介摘要"]),
      contact: {
        email: tx(props["Email"]),
        phone: tx(props["電話"]),
        address: tx(props["地址"]),
        contactPerson: tx(props["聯絡人"]),
      },
      links: {
        fb: url(props["FB粉專"]),
        ig: url(props["IG粉專"]),
        website: url(props["網路連結"]),
      },
      status,
    };
    const { error } = await supabase.from("persons").upsert(row, { onConflict: "notion_id" });
    if (error) throw new Error(`persons upsert: ${error.message}`);
    return { table: "persons", title: row.name, status };
  }

  return { table: "unknown", note: `經營類型=${type}, 對象選項=${objectType}，無對應同步邏輯`, nid };
}
