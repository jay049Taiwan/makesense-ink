import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, DB, extractTitle, extractText, extractSelect, extractMultiSelect, extractDate, extractRelation, extractNumber, extractStatus, extractUrl, updatePage, getPageContent } from "@/lib/notion";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300; // Vercel timeout 5 min

/**
 * POST /api/sync — Notion → Supabase 全量同步（批次 upsert 版）
 *
 * Query params:
 *   ?tables=products,events,articles — 只同步指定表（逗號分隔）
 *   ?writeback=true — 回寫 Notion（發佈狀態 + 對應連結）
 */
export async function POST(req: NextRequest) {
  const doWriteback = req.nextUrl.searchParams.get("writeback") === "true";
  const tablesParam = req.nextUrl.searchParams.get("tables");
  const only = tablesParam ? new Set(tablesParam.split(",").map(t => t.trim())) : null;
  const results: Record<string, { upserted: number; errors: number }> = {};

  const syncMap: Record<string, () => Promise<{ upserted: number; errors: number }>> = {
    persons: syncPersons,
    topics: syncTopics,
    partners: syncPartners,
    members: syncMembers,
    staff: syncStaff,
    products: () => syncProducts(doWriteback),
    events: () => syncEvents(doWriteback),
    articles: () => syncArticles(doWriteback),
  };

  const order = ["persons", "topics", "partners", "members", "staff", "products", "events", "articles"];

  try {
    for (const table of order) {
      if (only && !only.has(table)) continue;
      console.log(`[sync] start: ${table}`);
      const start = Date.now();
      results[table] = await syncMap[table]();
      console.log(`[sync] done: ${table} — ${results[table].upserted} upserted, ${results[table].errors} errors (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    }
    return NextResponse.json({ success: true, results, writeback: doWriteback });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json({ success: false, error: err.message, results }, { status: 500 });
  }
}

// ── Helpers ──

function nid(page: any): string { return page.id.replace(/-/g, ""); }
function p(page: any): Record<string, any> { return page.properties || {}; }

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

function ms(val: string | null, map: Record<string, string>): string {
  if (!val) return "draft";
  return map[val] || "draft";
}

const SITE_URL = "https://makesense.ink";
const BATCH_SIZE = 200; // 每批 upsert 筆數

/** 批次 upsert：每 BATCH_SIZE 筆送一次，批次間間隔 500ms 避免限流 */
async function batchUpsert(table: string, rows: Record<string, any>[], conflictKey: string): Promise<{ upserted: number; errors: number }> {
  let upserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey, count: "exact" });
    if (error) {
      console.error(`${table} batch err (${i}~${i + chunk.length}):`, error.message);
      errors += chunk.length;
    } else {
      upserted += count ?? chunk.length;
    }
    // 批次間延遲，避免 Supabase 限流
    if (i + BATCH_SIZE < rows.length) await new Promise(r => setTimeout(r, 500));
  }
  return { upserted, errors };
}

/** 回寫 Notion：更新發佈狀態 + 對應連結（只在對應連結為空時才寫） */
async function writeback(page: any, url: string, statusField: string, statusValue: string, urlField: string) {
  try {
    const existingUrl = page.properties?.[urlField]?.url;
    if (existingUrl) return;
    await updatePage(page.id, {
      [urlField]: { url },
      [statusField]: { status: { name: statusValue } },
    });
  } catch (e: any) {
    console.error("writeback err:", page.id, e.message);
  }
}

async function lookup(table: string, notionIds: string[]): Promise<Record<string, string>> {
  if (notionIds.length === 0) return {};
  const clean = [...new Set(notionIds.map(id => id.replace(/-/g, "")))];
  // Supabase IN 上限約 300，分批查
  const m: Record<string, string> = {};
  for (let i = 0; i < clean.length; i += 300) {
    const chunk = clean.slice(i, i + 300);
    const { data } = await supabase.from(table).select("id, notion_id").in("notion_id", chunk);
    for (const r of data || []) m[r.notion_id] = r.id;
  }
  return m;
}

// ── DB08 → persons ──
async function syncPersons() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "經營類型", select: { equals: "連結對象" } });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      type: extractSelect(props["對象選項"]?.select) || "個人",
      name: extractTitle(props["經營名稱"]?.title) || "未命名",
      bio: extractText(props["簡介摘要"]?.rich_text) || null,
      contact: {
        email: extractText(props["Email"]?.rich_text) || null,
        phone: extractText(props["電話"]?.rich_text) || null,
        address: extractText(props["地址"]?.rich_text) || null,
        contactPerson: extractText(props["聯絡人"]?.rich_text) || null,
      },
      links: {
        fb: extractUrl(props["FB粉專"]?.url) || null,
        ig: extractUrl(props["IG粉專"]?.url) || null,
        website: extractUrl(props["網路連結"]?.url) || null,
      },
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "已完成": "active", "待發佈": "active", "進行中": "draft", "不發佈": "active" }),
    };
  });
  return batchUpsert("persons", rows, "notion_id");
}

// ── DB08 → topics ──
async function syncTopics() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "經營類型", select: { equals: "主題標籤" } });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      name: extractTitle(props["經營名稱"]?.title) || "未命名",
      tag_type: ms(extractStatus(props["觀點狀態"]?.status), { "標籤": "tag", "觀點": "viewpoint" }) || "tag",
      summary: extractText(props["簡介摘要"]?.rich_text) || null,
      region: extractMultiSelect(props["觀點區域"]?.multi_select) || [],
      status: ms(extractStatus(props["觀點專頁"]?.status) || extractStatus(props["觀點狀態"]?.status), { "已完成": "active", "進行中": "draft" }),
    };
  });
  return batchUpsert("topics", rows, "notion_id");
}

// ── DB08 → partners ──
async function syncPartners() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, {
    and: [
      { property: "經營類型", select: { equals: "連結對象" } },
      { property: "對象選項", select: { equals: "合作夥伴" } },
    ],
  });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      type: extractSelect(props["單位選項"]?.select) || "民間單位",
      name: extractTitle(props["經營名稱"]?.title) || "未命名",
      contact: {
        email: extractText(props["Email"]?.rich_text) || null,
        phone: extractText(props["電話"]?.rich_text) || null,
        address: extractText(props["地址"]?.rich_text) || null,
        contactPerson: extractText(props["聯絡人"]?.rich_text) || null,
      },
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "已完成": "active", "待發佈": "active", "不發佈": "active" }),
    };
  });
  return batchUpsert("partners", rows, "notion_id");
}

// ── DB08 → members ──
async function syncMembers() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "會員狀態", status: { equals: "會員" } });
  const rows = pages
    .map(page => {
      const props = p(page);
      const email = extractText(props["Email"]?.rich_text);
      if (!email) return null;
      return {
        email,
        name: extractTitle(props["經營名稱"]?.title) || null,
        phone: extractText(props["電話"]?.rich_text) || null,
        line_uid: extractText(props["LINE_UID"]?.rich_text) || null,
        member_type: extractSelect(props["對象選項"]?.select) || null,
      };
    })
    .filter(Boolean) as Record<string, any>[];
  return batchUpsert("members", rows, "email");
}

// ── DB08 → staff ──
async function syncStaff() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "對象選項", select: { equals: "工作團隊" } });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      name: extractTitle(props["經營名稱"]?.title) || "未命名",
      role: extractSelect(props["職級細項"]?.select) || null,
    };
  });
  return batchUpsert("staff", rows, "notion_id");
}

// ── DB07 → products ──
async function syncProducts(wb = false) {
  const pages = await queryDatabase(DB.DB07_INVENTORY, { property: "庫存類型", select: { equals: "商品" } });

  // 批次反查 author/publisher
  const aIds: string[] = [], pIds: string[] = [];
  for (const page of pages) {
    const props = p(page);
    aIds.push(...extractRelation(props["對應作者"]?.relation));
    pIds.push(...extractRelation(props["對應發行"]?.relation));
  }
  const aMap = await lookup("persons", aIds);
  const pMap = await lookup("persons", pIds);

  const rows = pages.map(page => {
    const props = p(page);
    const authorRel = extractRelation(props["對應作者"]?.relation);
    const pubRel = extractRelation(props["對應發行"]?.relation);
    const aNid = authorRel[0]?.replace(/-/g, "");
    const pNid = pubRel[0]?.replace(/-/g, "");
    const cat = extractSelect(props["庫存類型"]?.select) || "";
    const sub = extractSelect(props["商品選項"]?.select) || "";
    return {
      notion_id: nid(page),
      sku: extractText(props["商品ID"]?.rich_text) || null,
      name: extractTitle(props["庫存名稱"]?.title) || "未命名",
      category: sub ? `${cat}/${sub}` : cat,
      price: extractNumber(props["庫存售價"]?.number) || 0,
      stock: extractNumber(props["庫存總計"]?.number) || extractNumber(props["庫存總計"]?.formula?.number) || 0,
      description: extractText(props["簡介摘要"]?.rich_text) || null,
      images: JSON.stringify(fileUrls(props["產品照片"])),
      author_id: aNid ? (aMap[aNid] || null) : null,
      publisher_id: pNid ? (pMap[pNid] || null) : null,
      sub_category: sub || null,
      supplier_type: extractSelect(props["進貨屬性"]?.select) || null,
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "active", "無發佈": "active" }),
    };
  });

  const result = await batchUpsert("products", rows, "notion_id");

  if (wb) {
    for (const page of pages) {
      await writeback(page, `${SITE_URL}/product/${nid(page)}`, "發佈狀態", "已發佈", "對應連結");
    }
  }
  return result;
}

// ── DB04 → events ──
async function syncEvents(wb = false) {
  const pages = await queryDatabase(DB.DB04_COLLABORATION, { property: "協作選項", select: { equals: "活動辦理" } });

  // 批次反查 relation → persons 名字
  const locIds: string[] = [], guideIds: string[] = [];
  for (const page of pages) {
    const props = p(page);
    locIds.push(...extractRelation(props["對應地點"]?.relation));
    guideIds.push(...extractRelation(props["對應對象"]?.relation));
  }
  const locMap = await lookup("persons", locIds);
  const guideMap = await lookup("persons", guideIds);

  const allPersonIds = [...new Set([...Object.values(locMap), ...Object.values(guideMap)])];
  let personNameMap: Record<string, string> = {};
  if (allPersonIds.length > 0) {
    // 分批取名字
    for (let i = 0; i < allPersonIds.length; i += 300) {
      const chunk = allPersonIds.slice(i, i + 300);
      const { data: persons } = await supabase.from("persons").select("id, name").in("id", chunk);
      for (const pr of persons || []) personNameMap[pr.id] = pr.name;
    }
  }

  const rows = pages.map(page => {
    const props = p(page);
    const dateInfo = extractDate(props["執行時間"]?.date);
    const locRel = extractRelation(props["對應地點"]?.relation);
    const locNid = locRel[0]?.replace(/-/g, "");
    const locUuid = locNid ? locMap[locNid] : undefined;
    const locationName = locUuid ? (personNameMap[locUuid] || null) : null;
    const guideRel = extractRelation(props["對應對象"]?.relation);
    const guideNid = guideRel[0]?.replace(/-/g, "");
    const guideUuid = guideNid ? guideMap[guideNid] : undefined;
    const guideName = guideUuid ? (personNameMap[guideUuid] || null) : null;

    return {
      notion_id: nid(page),
      title: extractTitle(props["交接名稱"]?.title) || "未命名活動",
      theme: extractSelect(props["活動類型"]?.select) || null,
      event_type: extractSelect(props["活動類型"]?.select) || null,
      event_date: dateInfo.start || null,
      price: extractNumber(props["實際單價"]?.number) || extractNumber(props["預計單價"]?.number) || 0,
      capacity: extractNumber(props["數量上限"]?.number) || null,
      cover_url: fileUrl(props["上傳檔案"]) || null,
      description: extractText(props["簡介摘要"]?.rich_text) || null,
      location: locationName,
      guide: guideName,
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "active", "不發佈": "active" }),
    };
  });

  const result = await batchUpsert("events", rows, "notion_id");

  if (wb) {
    for (const page of pages) {
      await writeback(page, `${SITE_URL}/events/${nid(page)}`, "發佈狀態", "已發佈", "對應連結");
    }
  }
  return result;
}

// ── DB05 → articles ──
async function syncArticles(wb = false) {
  const pages = await queryDatabase(DB.DB05_REGISTRATION, { property: "表單類型", select: { equals: "圖文影音" } });

  const eIds: string[] = [];
  for (const page of pages) { eIds.push(...extractRelation(p(page)["對應協作"]?.relation)); }
  const eMap = await lookup("events", eIds);

  const rows = pages.map(page => {
    const props = p(page);
    const dateInfo = extractDate(props["執行時間"]?.date);
    const eRel = extractRelation(props["對應協作"]?.relation);
    const eNid = eRel[0]?.replace(/-/g, "");
    return {
      notion_id: nid(page),
      title: extractTitle(props["表單名稱"]?.title) || "未命名文章",
      cover_url: fileUrl(props["上傳檔案"]) || null,
      related_event_id: eNid ? (eMap[eNid] || null) : null,
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "published", "發佈更新": "published", "已完成": "published", "待發佈": "published", "無發佈": "draft", "草稿": "draft" }),
      published_at: dateInfo.start || null,
    };
  });

  const result = await batchUpsert("articles", rows, "notion_id");

  if (wb) {
    for (const page of pages) {
      await writeback(page, `${SITE_URL}/post/${nid(page)}`, "發佈狀態", "已發佈", "對應連結");
    }
  }
  return result;
}
