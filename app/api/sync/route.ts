import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, DB, extractTitle, extractText, extractSelect, extractMultiSelect, extractDate, extractRelation, extractNumber, extractStatus, extractUrl, updatePage, getPageContent, getPage } from "@/lib/notion";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toTraditional } from "@/lib/zh-convert";

export const maxDuration = 300; // Vercel timeout 5 min

/**
 * POST /api/sync — Notion → Supabase 全量同步（批次 upsert 版）
 *
 * Query params:
 *   ?tables=products,events,articles — 只同步指定表（逗號分隔）
 *   ?writeback=true — 回寫 Notion（發佈狀態 + 對應連結）
 *   ?skip-images=true — 跳過 Cloudinary 圖片上傳（純資料補寫，避免 Vercel 5 min timeout）
 */
export async function POST(req: NextRequest) {
  const doWriteback = req.nextUrl.searchParams.get("writeback") === "true";
  const skipImages = req.nextUrl.searchParams.get("skip-images") === "true";
  const tablesParam = req.nextUrl.searchParams.get("tables");
  const only = tablesParam ? new Set(tablesParam.split(",").map(t => t.trim())) : null;
  const results: Record<string, { upserted: number; errors: number }> = {};

  const syncMap: Record<string, () => Promise<{ upserted: number; errors: number }>> = {
    persons: syncPersons,
    topics: syncTopics,
    partners: syncPartners,
    members: syncMembers,
    staff: syncStaff,
    db08_places: syncDb08Places,
    products: () => syncProducts(doWriteback, skipImages),
    events: () => syncEvents(doWriteback, skipImages),
    space_bookings: syncSpaceBookings,
    articles: () => syncArticles(doWriteback, skipImages),
  };

  const order = ["persons", "topics", "partners", "members", "staff", "db08_places", "products", "events", "space_bookings", "articles"];

  const failures: Record<string, string> = {};

  for (const table of order) {
    if (only && !only.has(table)) continue;
    console.log(`[sync] start: ${table}`);
    const start = Date.now();
    try {
      results[table] = await syncMap[table]();
      console.log(`[sync] done: ${table} — ${results[table].upserted} upserted, ${results[table].errors} errors (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    } catch (err: any) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`[sync] FAILED: ${table} after ${elapsed}s — ${err.message}`);
      failures[table] = err.message;
      results[table] = { upserted: 0, errors: -1 };
      // 繼續同步其餘表，不中斷
    }
  }

  const hasFailures = Object.keys(failures).length > 0;
  const allFailed = Object.keys(failures).length === Object.keys(results).length;

  return NextResponse.json(
    { success: !allFailed, partial: hasFailures && !allFailed, results, failures: hasFailures ? failures : undefined, writeback: doWriteback },
    { status: allFailed ? 500 : 200 }
  );
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

/**
 * 狀態映射：
 * 「已發佈」「待發佈」→ active/published（上架）
 * 「無發佈」「不發佈」→ "draft"（下架，仍寫入 Supabase 讓官網不顯示）
 * 空值（從未設定）→ null（不同步）
 */
function ms(val: string | null, map: Record<string, string>): string | null {
  if (!val) return null; // 從未設定，不同步
  if (val === "無發佈" || val === "不發佈") return "draft"; // 下架
  return map[val] || "draft";
}

const SITE_URL = "https://makesense.ink";
const BATCH_SIZE = 200; // 每批 upsert 筆數
const ENABLE_CLOUDINARY = true; // 同步時自動上傳圖片到 Cloudinary（可被 ?skip-images=true 覆寫）

/** 批次遷移 cover_url 到 Cloudinary（並行處理，每 5 張一組避免限流） */
async function migrateCoverUrls(rows: Record<string, any>[], table: string): Promise<void> {
  if (!ENABLE_CLOUDINARY) return;
  const CONCURRENCY = 5;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (row) => {
      if (!row.cover_url) return;
      if (row.cover_url.includes("res.cloudinary.com")) return;
      if (!row.cover_url.includes("notion-static") && !row.cover_url.includes("prod-files-secure")) return;
      try {
        const cdnUrl = await uploadToCloudinary(row.cover_url, `makesense/${table}`, row.notion_id);
        if (cdnUrl) row.cover_url = cdnUrl;
      } catch (e: any) { console.warn(`[img] ${row.notion_id}: ${e.message}`); }
    }));
  }
}

/** 批次遷移 products.images 到 Cloudinary */
async function migrateProductImages(rows: Record<string, any>[]): Promise<void> {
  if (!ENABLE_CLOUDINARY) return;
  const CONCURRENCY = 3;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (row) => {
      if (!row.images) return;
      let imgs: string[];
      try { imgs = JSON.parse(row.images); } catch { return; }
      if (imgs.length === 0) return;
      let changed = false;
      const newImgs = await Promise.all(imgs.map(async (url, idx) => {
        if (url.includes("res.cloudinary.com")) return url;
        if (!url.includes("notion-static") && !url.includes("prod-files-secure")) return url;
        try {
          const cdnUrl = await uploadToCloudinary(url, "makesense/products", `${row.notion_id}_${idx}`);
          if (cdnUrl && cdnUrl !== url) { changed = true; return cdnUrl; }
        } catch (e: any) { console.warn(`[img] ${row.notion_id}_${idx}: ${e.message}`); }
        return url;
      }));
      if (changed) row.images = JSON.stringify(newImgs);
    }));
  }
}

/** 批次 upsert：每 BATCH_SIZE 筆送一次，失敗自動重試一次（等 2s），批次間間隔 500ms 避免限流 */
async function batchUpsert(table: string, rows: Record<string, any>[], conflictKey: string): Promise<{ upserted: number; errors: number }> {
  let upserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    let { error, count } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey, count: "exact" });
    // 失敗時重試一次
    if (error) {
      console.warn(`[supabase] ${table} batch (${i}~${i + chunk.length}) failed: ${error.message} — retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      const retry = await supabase.from(table).upsert(chunk, { onConflict: conflictKey, count: "exact" });
      error = retry.error;
      count = retry.count;
      if (error) {
        console.error(`[supabase] ${table} batch (${i}~${i + chunk.length}) retry also failed: ${error.message}`);
      } else {
        console.log(`[supabase] ${table} batch (${i}~${i + chunk.length}) retry succeeded`);
      }
    }
    if (error) {
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

// ── 舊資料清理：刪除 Supabase 中不在新 sync set 裡的殘留 ──
async function cleanupStaleByNotionId(tableName: string, keepNotionIds: string[]) {
  if (keepNotionIds.length === 0) return;
  // Postgres 用 NOT IN 做排除（keepNotionIds 每批上限 1000 筆還安全）
  const { error, count } = await supabase
    .from(tableName)
    .delete({ count: "exact" })
    .not("notion_id", "in", `(${keepNotionIds.map(id => `"${id}"`).join(",")})`);
  if (error) {
    console.warn(`[sync] cleanup ${tableName} failed:`, error.message);
  } else if (count && count > 0) {
    console.log(`[sync] cleanup ${tableName}: removed ${count} stale rows`);
  }
}

// ── DB08 → persons（會員狀態=會員 AND 關係選項=個人） ──
async function syncPersons() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, {
    and: [
      { property: "會員狀態", status: { equals: "會員" } },
      { property: "關係選項", select: { equals: "個人" } },
    ],
  });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      type: extractSelect(props["關係選項"]?.select) || "個人",
      name: extractTitle(props["對象名稱"]?.title) || "未命名",
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
        website: extractUrl(props["官網ID"]?.url) || null,
      },
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "draft" }),
    };
  });
  const validRows = rows.filter(r => r.status !== null);
  const result = await batchUpsert("persons", validRows, "notion_id");
  await cleanupStaleByNotionId("persons", validRows.map(r => r.notion_id));
  return result;
}

// ── DB08 → topics（經營類型 IN 觀點, 標籤） ──
async function syncTopics() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, {
    or: [
      { property: "經營類型", select: { equals: "觀點" } },
      { property: "經營類型", select: { equals: "標籤" } },
    ],
  });

  // 先收集所有 DB08 page 的 4 個 relation 欄位會引用到的 notion_id
  // 再用 .in() 做精準查詢 — 避免 Supabase 預設 1000 筆 limit 把大表（如 products）截斷
  const needProdNids = new Set<string>();
  const needEventNids = new Set<string>();
  const needArticleNids = new Set<string>();
  const needTopicNids = new Set<string>();
  for (const page of pages) {
    const props = p(page);
    extractRelation(props["對應標籤庫存"]?.relation).forEach((id: string) => needProdNids.add(id.replace(/-/g, "")));
    extractRelation(props["對應標籤協作"]?.relation).forEach((id: string) => needEventNids.add(id.replace(/-/g, "")));
    extractRelation(props["對應標籤表單"]?.relation).forEach((id: string) => needArticleNids.add(id.replace(/-/g, "")));
    extractRelation(props["自對標籤"]?.relation).forEach((id: string) => needTopicNids.add(id.replace(/-/g, "")));
    extractRelation(props["自對零售內容"]?.relation).forEach((id: string) => needTopicNids.add(id.replace(/-/g, "")));
  }
  const fetchMap = async (table: string, nids: Set<string>): Promise<Map<string, string>> => {
    if (nids.size === 0) return new Map();
    // 分批（每 500 筆）避免 .in() 太長
    const arr = [...nids];
    const m = new Map<string, string>();
    for (let i = 0; i < arr.length; i += 500) {
      const chunk = arr.slice(i, i + 500);
      const { data } = await supabase.from(table).select("id, notion_id").in("notion_id", chunk);
      (data || []).forEach((r: any) => m.set(r.notion_id, r.id));
    }
    return m;
  };
  const [productIdByNid, eventIdByNid, articleIdByNid, topicIdByNid] = await Promise.all([
    fetchMap("products", needProdNids),
    fetchMap("events", needEventNids),
    fetchMap("articles", needArticleNids),
    fetchMap("topics", needTopicNids),
  ]);
  const resolveRel = (prop: any, m: Map<string, string>): string[] => {
    const ids = extractRelation(prop?.relation) || [];
    return ids.map((id: string) => m.get(id.replace(/-/g, ""))).filter(Boolean) as string[];
  };

  const rows = pages.map(page => {
    const props = p(page);
    const category = extractSelect(props["經營類型"]?.select);
    // 地址：(a) DB08「地址」rich_text 優先（手填，已是繁體）→ (b) 否則用 Notion Place 抽，opencc 簡轉繁
    const handAddr = extractText(props["地址"]?.rich_text);
    let addressText: string | null = handAddr || null;
    if (!addressText) {
      const placeProp = props["地點"];
      if (placeProp?.type === "place") {
        const placeAddr = placeProp.place?.address || null;
        addressText = toTraditional(placeAddr);
      }
    }
    // 自對零售內容 → notion_id 陣列（不轉 supabase id，給 /api/nearby 用 notion_id 比對）
    const retailCategoryNids = extractRelation(props["自對零售內容"]?.relation)
      .map((id: string) => id.replace(/-/g, ""))
      .filter(Boolean);
    return {
      notion_id: nid(page),
      name: extractTitle(props["對象名稱"]?.title) || "未命名",
      tag_type: category === "觀點" ? "viewpoint" : "tag",
      summary: extractText(props["簡介摘要"]?.rich_text) || null,
      cover_url: fileUrl(props["上傳檔案"]) || null,
      address_text: addressText,
      retail_category_ids: retailCategoryNids,
      region: (() => {
        const ms = extractMultiSelect(props["行政區域"]?.multi_select);
        if (ms && ms.length) return ms;
        const s = extractSelect(props["行政區域"]?.select);
        return s ? [s] : [];
      })(),
      related_product_ids: resolveRel(props["對應標籤庫存"], productIdByNid),
      related_event_ids: resolveRel(props["對應標籤協作"], eventIdByNid),
      related_article_ids: resolveRel(props["對應標籤表單"], articleIdByNid),
      related_tag_ids: resolveRel(props["自對標籤"], topicIdByNid),
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "draft" }),
    };
  });
  const validRows = rows.filter(r => r.status !== null);
  const result = await batchUpsert("topics", validRows, "notion_id");
  await cleanupStaleByNotionId("topics", validRows.map(r => r.notion_id));
  return result;
}

// ── DB08 → partners（會員狀態=會員 AND 關係選項=合作夥伴） ──
async function syncPartners() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, {
    and: [
      { property: "會員狀態", status: { equals: "會員" } },
      { property: "關係選項", select: { equals: "合作夥伴" } },
    ],
  });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      type: extractSelect(props["單位選項"]?.select) || "民間單位",
      name: extractTitle(props["對象名稱"]?.title) || "未命名",
      contact: {
        email: extractText(props["Email"]?.rich_text) || null,
        phone: extractText(props["電話"]?.rich_text) || null,
        address: extractText(props["地址"]?.rich_text) || null,
        contactPerson: extractText(props["聯絡人"]?.rich_text) || null,
      },
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "draft" }),
    };
  });
  const validRows = rows.filter(r => r.status !== null);
  const result = await batchUpsert("partners", validRows, "notion_id");
  await cleanupStaleByNotionId("partners", validRows.map(r => r.notion_id));
  return result;
}

// ── DB08 → members（會員狀態=會員，email 為主鍵） ──
async function syncMembers() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "會員狀態", status: { equals: "會員" } });
  const rows = pages
    .map(page => {
      const props = p(page);
      const email = extractText(props["Email"]?.rich_text);
      if (!email) return null;
      return {
        email,
        name: extractTitle(props["對象名稱"]?.title) || null,
        phone: extractText(props["電話"]?.rich_text) || null,
        line_uid: extractText(props["LINE_UID"]?.rich_text) || null,
        member_type: extractSelect(props["關係選項"]?.select) || null,
      };
    })
    .filter(Boolean) as Record<string, any>[];
  return batchUpsert("members", rows, "email");
  // NOTE: members 以 email 為主鍵、可能有手動建立的（訪客下單），不做 cleanup
}

// ── DB08 → staff（會員狀態=會員 AND 關係選項=工作團隊） ──
async function syncStaff() {
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, {
    and: [
      { property: "會員狀態", status: { equals: "會員" } },
      { property: "關係選項", select: { equals: "工作團隊" } },
    ],
  });
  const rows = pages.map(page => {
    const props = p(page);
    return {
      notion_id: nid(page),
      name: extractTitle(props["對象名稱"]?.title) || "未命名",
      role: extractSelect(props["職級細項"]?.select) || null,
    };
  });
  const result = await batchUpsert("staff", rows, "notion_id");
  await cleanupStaleByNotionId("staff", rows.map(r => r.notion_id));
  return result;
}

// ── DB08 → db08_places（不限經營類型，只要「地點」property 有座標就 upsert）──
// 這張表是全工作區的地點權威，給走讀路線、地圖功能用
async function syncDb08Places() {
  // 拉所有 DB08 page，沒 filter（紀錄類也要）
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP);
  const rows = pages
    .map(page => {
      const props = p(page);
      const placeProp = props["地點"];
      if (placeProp?.type !== "place") return null;
      const place = placeProp.place;
      if (!place || place.lat == null || place.lon == null) return null;
      return {
        notion_id: nid(page),
        name: extractTitle(props["對象名稱"]?.title) || "未命名",
        place,
        region: extractSelect(props["行政區域"]?.select) || null,
        category: extractSelect(props["經營類型"]?.select) || null,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const result = await batchUpsert("db08_places", rows, "notion_id");
  // 注意：不做 cleanupStaleByNotionId，因為 DB08 中曾經有座標、後來刪掉的地點仍可能在 events.route_stops 裡被引用
  return result;
}

// ── DB07 → products ──
async function syncProducts(wb = false, skipImages = false) {
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
      barcode: extractText(props["商品ID"]?.rich_text) || null,  // 商品 ID 直接當條碼用（ISBN/EAN）
      name: extractTitle(props["庫存名稱"]?.title) || "未命名",
      category: sub ? `${cat}/${sub}` : cat,
      price: extractNumber(props["庫存售價"]?.number) || 0,
      stock: extractNumber(props["庫存總計"]?.number) || extractNumber(props["庫存總計"]?.formula?.number) || 0,
      description: extractText(props["簡介摘要"]?.rich_text) || null,
      images: JSON.stringify(fileUrls(props["產品照片"])),
      author_id: aNid ? (aMap[aNid] || null) : null,
      publisher_id: pNid ? (pMap[pNid] || null) : null,
      publisher_notion_id: pNid || null,
      owner_staff_notion_id: (props["責任執行"]?.people || [])[0]?.id || null,
      sub_category: sub || null,
      supplier_type: extractSelect(props["進貨屬性"]?.select) || null,
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "draft" }),
      page_status: extractStatus(props["頁面狀態"]?.status) || "無頁面",
    };
  });

  // 過濾掉無發佈狀態的（不送到 Supabase）
  const validRows = rows.filter(r => r.status !== null);
  console.log(`[sync] products: ${rows.length} total, ${validRows.length} with publish status`);

  // 圖片遷移到 Cloudinary（在 upsert 前；?skip-images=true 時略過）
  if (!skipImages) await migrateProductImages(validRows);

  const result = await batchUpsert("products", validRows, "notion_id");

  if (wb) {
    for (const page of pages) {
      await writeback(page, `${SITE_URL}/product/${nid(page)}`, "發佈狀態", "已發佈", "對應連結");
    }
  }
  return result;
}

// ── DB04 → events ──
async function syncEvents(wb = false, skipImages = false) {
  const pages = await queryDatabase(DB.DB04_COLLABORATION, { property: "協作類別", select: { equals: "活動辦理" } });

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

  // ─── route_stops 預備：一次撈所有「內容名稱=路線腳本」DB05 entries，按事件分組 ───
  let stopsByEvent: Record<string, any[]> = {};
  let locNameMap: Record<string, string> = {};
  try {
    const allStops = await queryDatabase(DB.DB05_REGISTRATION, {
      property: "內容名稱",
      title: { equals: "路線腳本" },
    });
    for (const stopPage of allStops) {
      const stopProps = (stopPage as any).properties || {};
      const eventRels = extractRelation(stopProps["對應協作"]?.relation);
      const eventNid = eventRels[0]?.replace(/-/g, "");
      if (!eventNid) continue;
      (stopsByEvent[eventNid] ||= []).push(stopPage);
    }
    for (const k in stopsByEvent) {
      stopsByEvent[k].sort((a: any, b: any) =>
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      );
    }
    // 收集所有 stop 的對應地點 ids
    const allLocIds = new Set<string>();
    for (const stops of Object.values(stopsByEvent)) {
      for (const sp of stops) {
        const id = extractRelation((sp as any).properties?.["對應地點"]?.relation)[0];
        if (id) allLocIds.add(id.replace(/-/g, ""));
      }
    }
    const locIdsArr = [...allLocIds];
    if (locIdsArr.length > 0) {
      // 先 Supabase persons / topics / partners 反查
      for (const tbl of ["persons", "topics", "partners"] as const) {
        const remaining = locIdsArr.filter(id => !locNameMap[id]);
        if (remaining.length === 0) break;
        for (let i = 0; i < remaining.length; i += 300) {
          const chunk = remaining.slice(i, i + 300);
          const { data } = await supabase.from(tbl).select("notion_id, name").in("notion_id", chunk);
          for (const d of (data || []) as any[]) locNameMap[d.notion_id] = d.name;
        }
      }
      // 還沒找到的：fallback 直接打 Notion 抓 page title「對象名稱」
      const missing = locIdsArr.filter(id => !locNameMap[id]);
      for (const id of missing) {
        try {
          const pg: any = await getPage(id);
          const title = (pg.properties?.["對象名稱"]?.title || []).map((x: any) => x.plain_text).join("");
          if (title) locNameMap[id] = title;
        } catch { /* 該 page 抓不到就算了，stop 顯示「未命名地點」 */ }
      }
    }
  } catch (e: any) {
    console.warn(`[sync] route_stops 撈取失敗: ${e?.message}（events 仍會同步，只是路線資料空）`);
  }

  // ─── tickets 預備：用 Supabase products 表批次反查（products 表已先同步完成）───
  let ticketInfoMap: Record<string, { name: string; price: number }> = {};
  const allTicketIds = new Set<string>();
  for (const page of pages) {
    const rels = extractRelation((page as any).properties?.["對應庫存"]?.relation);
    for (const r of rels) allTicketIds.add(r.replace(/-/g, ""));
  }
  if (allTicketIds.size > 0) {
    const arr = [...allTicketIds];
    for (let i = 0; i < arr.length; i += 300) {
      const chunk = arr.slice(i, i + 300);
      const { data } = await supabase
        .from("products")
        .select("notion_id, title, price")
        .in("notion_id", chunk);
      for (const d of (data || []) as any[]) {
        ticketInfoMap[d.notion_id] = { name: d.title || "", price: Number(d.price) || 0 };
      }
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

    // 合作夥伴關聯：對應對象 + 對應辦理單位（raw notion_id，不轉 uuid）
    const pubRel = extractRelation(props["對應辦理單位"]?.relation);
    const relatedPartnerIds = [...new Set([
      ...guideRel.map((id: string) => id.replace(/-/g, "")),
      ...pubRel.map((id: string) => id.replace(/-/g, "")),
    ])].filter(Boolean);

    // 計算活動時長：end - start（分鐘）；只有單一日期時預設 120 分鐘（2小時）
    const durationMin = dateInfo.start && dateInfo.end
      ? Math.round((new Date(dateInfo.end).getTime() - new Date(dateInfo.start).getTime()) / 60000)
      : (dateInfo.start ? 120 : null);

    // route_stops：對應到此活動的「路線腳本」DB05 entries
    const eventNid = nid(page);
    const stops = stopsByEvent[eventNid] || [];
    const route_stops = stops.map((sp: any) => {
      const locId = extractRelation(sp.properties?.["對應地點"]?.relation)[0]?.replace(/-/g, "");
      const name = (locId && locNameMap[locId]) || "未命名地點";
      const desc = extractText(sp.properties?.["明細內容"]?.rich_text) || "";
      return { name, desc };
    });

    // tickets：對應庫存 → DB07 products
    const ticketRels = extractRelation(props["對應庫存"]?.relation);
    const tickets = ticketRels
      .map((id: string) => {
        const cleanId = id.replace(/-/g, "");
        const info = ticketInfoMap[cleanId];
        if (!info || !info.name) return null;
        return { name: info.name, price: String(info.price), notion_id: cleanId };
      })
      .filter((x): x is { name: string; price: string; notion_id: string } => x !== null);

    return {
      notion_id: eventNid,
      title: extractText(props["主題名稱"]?.rich_text) || extractTitle(props["協作名稱"]?.title) || "未命名活動",
      theme: extractSelect(props["活動選項"]?.select) || null,
      event_type: extractSelect(props["活動選項"]?.select) || null,
      event_date: dateInfo.start || null,
      duration_min: durationMin,
      distance_km: extractNumber(props["距離km"]?.number) ?? null,
      price: Number(props["實際總價"]?.formula?.number) || 0,
      capacity: extractNumber(props["數量上限"]?.number) || null,
      min_capacity: extractNumber(props["最低數量"]?.number) || null,
      cover_url: fileUrl(props["上傳檔案"]) || null,
      description: extractText(props["簡介摘要"]?.rich_text) || null,
      location: locationName,
      guide: guideName,
      related_partner_ids: relatedPartnerIds.length > 0 ? relatedPartnerIds : null,
      event_category: extractSelect(props["交接類型"]?.select) || null,
      collab_type: extractSelect(props["協作類別"]?.select) || null,
      owner_staff_notion_id: (props["責任執行"]?.people || [])[0]?.id || null,
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "待發佈": "draft" }),
      route_stops,
      tickets,
    };
  });

  const validRows = rows.filter(r => r.status !== null);
  console.log(`[sync] events: ${rows.length} total, ${validRows.length} with publish status`);

  if (!skipImages) await migrateCoverUrls(validRows, "events");

  const result = await batchUpsert("events", validRows, "notion_id");

  if (wb) {
    for (const page of pages) {
      await writeback(page, `${SITE_URL}/events/${nid(page)}`, "發佈狀態", "已發佈", "對應連結");
    }
  }
  return result;
}

// ── DB04（門市類別=使用場地）→ space_bookings (source=internal) ──
async function syncSpaceBookings() {
  const pages = await queryDatabase(DB.DB04_COLLABORATION, { property: "門市類別", select: { equals: "使用場地" } });

  // 反查地點與對象（DB08 對象名稱）
  const locIds: string[] = [], guideIds: string[] = [];
  for (const page of pages) {
    const props = p(page);
    locIds.push(...extractRelation(props["對應地點"]?.relation));
    guideIds.push(...extractRelation(props["對應對象"]?.relation));
  }
  const allDb08Ids = [...new Set([...locIds, ...guideIds].map(id => id.replace(/-/g, "")))];
  const db08NameMap: Record<string, string> = {};
  if (allDb08Ids.length > 0) {
    // 從 persons 撈名字（DB08 → persons table 已透過 syncPersons 同步）
    for (let i = 0; i < allDb08Ids.length; i += 300) {
      const chunk = allDb08Ids.slice(i, i + 300);
      const { data: persons } = await supabase.from("persons").select("notion_id, name").in("notion_id", chunk);
      for (const pr of persons || []) if (pr.notion_id) db08NameMap[pr.notion_id] = pr.name;
    }
  }

  const rows = pages.map(page => {
    const props = p(page);
    const dateInfo = extractDate(props["執行時間"]?.date);
    if (!dateInfo.start) return null; // 沒日期跳過

    const startHour = new Date(dateInfo.start).getHours();
    const time_slot = startHour >= 12 ? "afternoon" : "morning";
    const booking_date = dateInfo.start.slice(0, 10);

    const locNid = extractRelation(props["對應地點"]?.relation)[0]?.replace(/-/g, "");
    const venue = locNid ? (db08NameMap[locNid] || "未指定") : "未指定";

    const guideNid = extractRelation(props["對應對象"]?.relation)[0]?.replace(/-/g, "");
    const contact_name = guideNid ? (db08NameMap[guideNid] || null) : null;

    return {
      notion_db04_id: nid(page),
      booking_date,
      time_slot,
      venue,
      status: "confirmed",
      source: "internal",
      contact_name,
      contact_phone: null,
      contact_email: null,
      usage_type: "內部使用",
      attendee_count: extractNumber(props["數量上限"]?.number) || null,
      event_summary: extractText(props["簡介摘要"]?.rich_text) || null,
      notion_page_id: page.id,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`[sync] space_bookings (internal): ${rows.length} rows`);
  return await batchUpsert("space_bookings", rows, "booking_date,time_slot,venue");
}

// ── DB05 → articles ──
async function syncArticles(wb = false, skipImages = false) {
  const pages = await queryDatabase(DB.DB05_REGISTRATION, { property: "文案選項", select: { equals: "官網內容" } });

  const eIds: string[] = [];
  const pIds: string[] = [];
  for (const page of pages) {
    eIds.push(...extractRelation(p(page)["對應協作"]?.relation));
    pIds.push(...extractRelation(p(page)["對應庫存"]?.relation));
  }
  const eMap = await lookup("events", eIds);
  const pMap = await lookup("products", pIds);

  const rows = pages.map(page => {
    const props = p(page);
    const dateInfo = extractDate(props["執行時間"]?.date);
    const eRel = extractRelation(props["對應協作"]?.relation);
    const eNid = eRel[0]?.replace(/-/g, "");
    const pRel = extractRelation(props["對應庫存"]?.relation);
    const pNids = pRel.map((r: string) => r.replace(/-/g, ""));
    const pNid = pNids[0];
    const pIdsAll = pNids.map((n: string) => pMap[n]).filter(Boolean);
    // 合作夥伴關聯：對應對象（raw notion_id，不轉 uuid）
    const objRel = extractRelation(props["對應對象"]?.relation);
    const relatedPartnerIds = objRel.map((id: string) => id.replace(/-/g, "")).filter(Boolean);
    return {
      notion_id: nid(page),
      title: extractText(props["主題名稱"]?.rich_text) || extractTitle(props["內容名稱"]?.title) || "未命名文章",
      summary: extractText(props["簡介摘要"]?.rich_text) || null,
      cover_url: fileUrl(props["上傳檔案"]) || null,
      related_event_id: eNid ? (eMap[eNid] || null) : null,
      related_product_id: pNid ? (pMap[pNid] || null) : null,
      related_product_ids: pIdsAll,
      related_partner_ids: relatedPartnerIds.length > 0 ? relatedPartnerIds : null,
      // 2026/04/22：官網備項是 select（單值），包成 text[] 儲存以便未來擴展
      web_tag: (() => {
        const v = extractSelect(props["官網備項"]?.select);
        return v ? [v] : null;
      })(),
      status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "published", "待發佈": "draft" }),
      published_at: dateInfo.start || null,
    };
  });

  const validRows = rows.filter(r => r.status !== null);
  console.log(`[sync] articles: ${rows.length} total, ${validRows.length} with publish status`);

  if (!skipImages) await migrateCoverUrls(validRows, "articles");

  const result = await batchUpsert("articles", validRows, "notion_id");

  if (wb) {
    for (const page of pages) {
      await writeback(page, `${SITE_URL}/post/${nid(page)}`, "發佈狀態", "已發佈", "對應連結");
    }
  }
  return result;
}
