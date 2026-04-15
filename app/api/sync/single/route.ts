import { NextRequest, NextResponse } from "next/server";
import { getPage, getPageContent, extractTitle, extractText, extractSelect, extractMultiSelect, extractDate, extractRelation, extractNumber, extractStatus, extractUrl, updatePage } from "@/lib/notion";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { translateRow } from "@/lib/translate";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://makesense.ink").trim();

export const maxDuration = 300; // Pro 方案最大 5 分鐘

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
        result = await syncSingleDB05(cleanId, props);
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

    // 回寫 Notion（阻塞式，確保執行完成）
    if (result && !result.skipped) {
      const urlMap: Record<string, string> = {
        events: `${SITE_URL}/events/${cleanId}`,
        articles: `${SITE_URL}/post/${cleanId}`,
        products: `${SITE_URL}/product/${cleanId}`,
        topics: `${SITE_URL}/viewpoint/${cleanId}`,
      };
      const table = result.table;
      if (urlMap[table] && result.status !== "draft" && result.status !== null) {
        await writebackPublish(cleanId, urlMap[table]);
      } else if (result.status === "draft") {
        await writebackUnpublish(cleanId);
      }

      // AI 翻譯（非阻塞，背景做就好）
      if (result.title) {
        triggerTranslation(table, cleanId, result).catch(e => console.warn(`[translate] ${e.message}`));
      }
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
function num(prop: any) { return extractNumber(prop?.number) ?? extractNumber(prop?.formula?.number) ?? null; }
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

/**
 * 狀態映射：
 * 「已發佈」「待發佈」→ active/published（上架）
 * 「無發佈」「不發佈」→ "draft"（下架）
 * 空值（從未設定）→ null（不同步）
 */
function mapStatus(val: string | null, map: Record<string, string>): string | null {
  if (!val) return null; // 從未設定，不同步
  if (val === "無發佈" || val === "不發佈") return "draft"; // 下架
  return map[val] || "draft";
}

/** 回寫 Notion：上架 → 狀態改「已發佈」+ 寫入 URL */
async function writebackPublish(pageId: string, url: string) {
  const uuid = pageId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  try {
    await updatePage(uuid, {
      "發佈狀態": { status: { name: "已發佈" } },
      "對應連結": { url },
    });
  } catch (err: any) {
    console.warn(`[writeback] Publish failed for ${pageId}: ${err.message}`);
  }
}

/** 回寫 Notion：下架 → 狀態改「待發佈」 */
async function writebackUnpublish(pageId: string) {
  try {
    const uuid = pageId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    await updatePage(uuid, {
      "發佈狀態": { status: { name: "待發佈" } },
    });
  } catch (err: any) {
    console.warn(`[writeback] Unpublish failed for ${pageId}: ${err.message}`);
  }
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
    title: tx(props["主題名稱"]) || t(props["交接名稱"]) || "未命名活動",
    theme: sel(props["活動類型"]),
    event_type: sel(props["活動類型"]),
    event_date: dateInfo.start || null,
    price: num(props["實際單價"]) || num(props["預計單價"]) || 0,
    capacity: num(props["數量上限"]),
    cover_url: fileUrl(props["上傳檔案"]),
    description: tx(props["簡介摘要"]),
    location: locationName,
    guide: guideName,
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" }),
  };
  if (row.status === null) return { table: "events", title: row.title, status: null, skipped: true };
  const { error } = await supabase.from("events").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`events upsert: ${error.message}`);
  // 回寫在主函式統一處理（非阻塞）
  return { table: "events", title: row.title, status: row.status };
}

// ── DB05 分流：文章 or 庫存批次 ──
async function syncSingleDB05(nid: string, props: any) {
  const formType = sel(props["表單類型"]);
  const interactionOption = sel(props["互動選項"]);

  // 庫存批次：表單類型=共識互動 + 互動選項=紀錄庫存
  if (formType === "共識互動" && interactionOption === "紀錄庫存") {
    return await syncStockBatch(nid, props);
  }

  // 其他：當作文章處理
  return await syncSingleArticle(nid, props);
}

// ── DB05 庫存批次（一次更新所有關聯 DB06 的庫存）──
async function syncStockBatch(nid: string, props: any) {
  const action = sel(props["庫存選項"]); // 進貨 / 出貨 / 盤點
  if (!action) {
    return { table: "stock_batch", note: "缺少庫存選項（進貨/出貨/盤點）", nid, skipped: true };
  }

  // 讀取「對應明細」relation → DB06 page IDs
  const db06Rels = rel(props["對應明細"]);
  if (!db06Rels || db06Rels.length === 0) {
    return { table: "stock_batch", note: "沒有對應明細（DB06）", nid, skipped: true };
  }

  let updated = 0;
  let errors = 0;
  const details: { product: string; action: string; qty: number; before: number; after: number }[] = [];

  for (const db06Ref of db06Rels) {
    try {
      const db06Id = db06Ref.replace(/-/g, "");
      const db06Uuid = db06Ref.length === 32
        ? db06Ref.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5")
        : db06Ref;

      // 讀取 DB06 頁面
      const db06Page = await getPage(db06Uuid);
      const db06Props: Record<string, any> = (db06Page as any).properties || {};

      const quantity = num(db06Props["登記數量"]) || 0;
      if (quantity === 0) continue;

      // 找對應庫存（DB07 商品）
      const productRels = rel(db06Props["對應庫存"]);
      if (!productRels || productRels.length === 0) continue;

      const productNotionId = productRels[0].replace(/-/g, "");
      const { data: product } = await supabase
        .from("products")
        .select("id, name, stock")
        .eq("notion_id", productNotionId)
        .maybeSingle();

      if (!product) continue;

      const currentStock = product.stock || 0;
      let newStock = currentStock;

      if (action === "進貨") newStock = currentStock + quantity;
      else if (action === "出貨") newStock = Math.max(0, currentStock - quantity);
      else if (action === "盤點") newStock = quantity;
      else continue;

      const { error } = await supabase
        .from("products")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", product.id);

      if (error) { errors++; continue; }

      details.push({ product: product.name, action, qty: quantity, before: currentStock, after: newStock });
      updated++;
    } catch (err: any) {
      console.warn(`[stock_batch] DB06 error: ${err.message}`);
      errors++;
    }
  }

  // 回寫 DB05 發佈狀態
  const status = mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" });
  if (status && status !== "draft") {
    // 庫存批次回寫在主函式統一處理
  }

  return {
    table: "stock_batch",
    action,
    totalDB06: db06Rels.length,
    updated,
    errors,
    details: details.slice(0, 10), // 只回傳前 10 筆避免 response 太大
  };
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

  // 抓文章正文（Notion blocks → HTML）
  let content: string | null = null;
  try {
    const pageId = nid.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    content = await getPageContent(pageId);
    if (content && content.trim().length === 0) content = null;
  } catch (e: any) {
    console.warn("article content fetch failed:", e.message);
  }

  const row: Record<string, any> = {
    notion_id: nid,
    title: tx(props["主題名稱"]) || t(props["表單名稱"]) || "未命名文章",
    cover_url: fileUrl(props["上傳檔案"]),
    related_event_id: relatedEventId,
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "published", "待發佈": "published" }),
    published_at: dateInfo.start || null,
  };
  if (content) row.content = content;

  if (row.status === null) return { table: "articles", title: row.title, status: null, skipped: true };
  const { error } = await supabase.from("articles").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`articles upsert: ${error.message}`);
  // 回寫在主函式統一處理（非阻塞）
  return { table: "articles", title: row.title, status: row.status, hasContent: !!content };
}

// ── DB06 → 庫存異動（進貨/出貨直接更新 products.stock）──
async function syncSingleTransaction(nid: string, props: any) {
  // 讀取 DB06 欄位
  // 「進出退換」是 rollup（來自 DB05 的 select），需要特殊讀法
  const rawRollup = props["進出退換"]?.rollup?.array;
  const action = rawRollup?.[0]?.select?.name || sel(props["進出退換"]) || null;
  const quantity = num(props["登記數量"]) || 0;

  if (!action || quantity === 0) {
    return { table: "stock_update", note: "缺少進出退換或登記數量", nid, skipped: true };
  }

  // 「對應庫存」是 relation → DB07，取得對應商品的 notion_id
  const productRels = rel(props["對應庫存"]);
  if (!productRels || productRels.length === 0) {
    return { table: "stock_update", note: "缺少對應庫存（未連結商品）", nid, skipped: true };
  }

  const productNotionId = productRels[0].replace(/-/g, "");

  // 查 Supabase 找到對應商品
  const { data: product } = await supabase
    .from("products")
    .select("id, name, stock")
    .eq("notion_id", productNotionId)
    .maybeSingle();

  if (!product) {
    return { table: "stock_update", note: `找不到商品 notion_id=${productNotionId}`, nid, skipped: true };
  }

  const currentStock = product.stock || 0;
  let newStock = currentStock;

  if (action === "進貨") {
    newStock = currentStock + quantity;
  } else if (action === "出貨") {
    newStock = Math.max(0, currentStock - quantity);
  } else if (action === "盤點") {
    // 盤點 = 直接設定為登記數量（覆蓋）
    newStock = quantity;
  } else {
    return { table: "stock_update", note: `未知的進出退換類型: ${action}`, nid, skipped: true };
  }

  // 更新 Supabase 庫存
  const { error } = await supabase
    .from("products")
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", product.id);

  if (error) throw new Error(`stock update: ${error.message}`);

  return {
    table: "stock_update",
    product: product.name,
    action,
    quantity,
    before: currentStock,
    after: newStock,
  };
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

  // 對應標籤 → DB08 topics（相關觀點）
  const topicRels = rel(props["對應標籤"]);
  const topicNotionIds = topicRels.map((r: string) => r.replace(/-/g, ""));
  let relatedTopicIds: string[] = [];
  if (topicNotionIds.length > 0) {
    const { data: topics } = await supabase.from("topics").select("id").in("notion_id", topicNotionIds);
    relatedTopicIds = (topics || []).map((t: any) => t.id);
  }

  // 對應表單 → DB05 articles（對應內容）
  const articleRels = rel(props["對應表單"]);
  const articleNotionIds = articleRels.map((r: string) => r.replace(/-/g, ""));
  let relatedArticleIds: string[] = [];
  if (articleNotionIds.length > 0) {
    const { data: articles } = await supabase.from("articles").select("id").in("notion_id", articleNotionIds);
    relatedArticleIds = (articles || []).map((a: any) => a.id);
  }

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
    sub_category: sub || null,
    supplier_type: sel(props["進貨屬性"]) || null,
    related_topic_ids: JSON.stringify(relatedTopicIds),
    related_article_ids: JSON.stringify(relatedArticleIds),
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" }),
  };
  if (row.status === null) return { table: "products", title: row.name, status: null, skipped: true };
  const { error } = await supabase.from("products").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`products upsert: ${error.message}`);
  // 回寫在主函式統一處理（非阻塞）
  return { table: "products", title: row.name, status: row.status };
}

// ── DB08 → persons / topics / partners / members / staff ──
async function syncSingleRelation(nid: string, props: any) {
  const type = sel(props["經營類型"]);
  const objectType = sel(props["對象選項"]);
  const status = mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" });

  // 根據「經營類型」決定寫入哪張表
  if (type === "主題標籤") {
    // 抓觀點正文
    let content: string | null = null;
    try {
      const pageId = nid.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
      content = await getPageContent(pageId);
      if (content && content.trim().length === 0) content = null;
    } catch (e: any) {
      console.warn("topic content fetch failed:", e.message);
    }

    const row: Record<string, any> = {
      notion_id: nid,
      name: t(props["經營名稱"]) || "未命名",
      tag_type: mapStatus(st(props["觀點狀態"]), { "標籤": "tag", "觀點": "viewpoint" }) || "tag",
      summary: tx(props["簡介摘要"]),
      region: extractMultiSelect(props["觀點區域"]?.multi_select) || [],
      status,
    };
    if (content) row.content = content;

    if (status === null) return { table: "topics", title: row.name, status: null, skipped: true };
    const { error } = await supabase.from("topics").upsert(row, { onConflict: "notion_id" });
    if (error) throw new Error(`topics upsert: ${error.message}`);
    // 回寫在主函式統一處理（非阻塞）
    return { table: "topics", title: row.name, status, hasContent: !!content };
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
      if (status === null) return { table: "partners", title: row.name, status: null, skipped: true };
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
    if (status === null) return { table: "persons", title: row.name, status: null, skipped: true };
    const { error } = await supabase.from("persons").upsert(row, { onConflict: "notion_id" });
    if (error) throw new Error(`persons upsert: ${error.message}`);
    return { table: "persons", title: row.name, status };
  }

  return { table: "unknown", note: `經營類型=${type}, 對象選項=${objectType}，無對應同步邏輯`, nid };
}

// ── 背景翻譯觸發 ──
async function triggerTranslation(table: string, notionId: string, syncResult: any) {
  // 只翻需要顯示在前端的表
  const fieldMap: Record<string, string[]> = {
    products: ["name", "description"],
    events: ["title", "description"],
    articles: ["title"],  // content 太長，單獨翻譯
    topics: ["name", "summary"],
  };
  const fields = fieldMap[table];
  if (!fields) return;

  // 查 Supabase 取得 UUID 和欄位值
  const { data: row } = await supabase
    .from(table)
    .select(`id, ${fields.join(", ")}`)
    .eq("notion_id", notionId)
    .maybeSingle();

  if (!row) return;

  const translateFields: Record<string, string | null> = {};
  for (const f of fields) {
    translateFields[f] = row[f] || null;
  }

  await translateRow({ tableName: table, rowId: row.id, fields: translateFields });
}
