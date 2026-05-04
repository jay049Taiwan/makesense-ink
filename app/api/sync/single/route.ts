import { NextRequest, NextResponse } from "next/server";
import { getPage, getPageContent, extractTitle, extractText, extractSelect, extractMultiSelect, extractDate, extractRelation, extractNumber, extractStatus, extractUrl, updatePage } from "@/lib/notion";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { translateRow } from "@/lib/translate";
import { processAdmission } from "@/lib/admission-notify";

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
      // 話題推薦用的 DB05 文章不提供獨立頁面連結，只回寫發佈狀態，URL 設為 null
      const isShowcaseOnly = table === "articles" && Array.isArray(result.webTag) && result.webTag.includes("話題推薦");
      if (urlMap[table] && result.status !== "draft" && result.status !== null) {
        if (isShowcaseOnly) {
          await writebackPublishNoUrl(cleanId);
        } else {
          await writebackPublish(cleanId, urlMap[table]);
        }
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
  const NOTION_KEY = process.env.NOTION_API_KEY;

  // 用 fetch 直接呼叫 Notion REST API（繞過 SDK 可能的 bug）
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${uuid}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${NOTION_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          "發佈狀態": { status: { name: "已發佈" } },
          "對應連結": { url },
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn(`[writeback] Notion API ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
    } else {
      console.log(`[writeback] OK for ${pageId}`);
    }
  } catch (err: any) {
    console.warn(`[writeback] Failed for ${pageId}: ${err.message}`);
  }
}

/** 回寫 Notion：話題推薦上架 → 狀態「已發佈」+ 對應連結指向旅人書店首頁（方便 Noah 辨識/點擊確認） */
async function writebackPublishNoUrl(pageId: string) {
  try {
    const uuid = pageId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    await updatePage(uuid, {
      "發佈狀態": { status: { name: "已發佈" } },
      "對應連結": { url: `${SITE_URL}/bookstore` },
    });
  } catch (err: any) {
    console.warn(`[writeback] PublishNoUrl failed for ${pageId}: ${err.message}`);
  }
}

/** 回寫 Notion：下架 → 狀態改「待發佈」+ 清空對應連結（方便辨識該頁已不在官網） */
async function writebackUnpublish(pageId: string) {
  try {
    const uuid = pageId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    await updatePage(uuid, {
      "發佈狀態": { status: { name: "待發佈" } },
      "對應連結": { url: null },
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
  const publisherRels = rel(props["對應辦理單位"]);
  const locationName = locRels[0] ? await lookupPersonName(locRels[0]) : null;
  const guideName = guideRels[0] ? await lookupPersonName(guideRels[0]) : null;

  // related_partner_ids：合併「對應對象」+「對應辦理單位」的 DB08 notion_ids（32碼無dash）
  const relatedPartnerIds = [...new Set(
    [...guideRels, ...publisherRels].map(id => id.replace(/-/g, "")).filter(Boolean)
  )];

  // 對應庫存 relation → DB07 票券（每個都是一種票種）
  const ticketRels = rel(props["對應庫存"]);
  const tickets = (await Promise.all(
    ticketRels.map(async (pid) => {
      try {
        const page: any = await getPage(pid);
        const name = t(page.properties["庫存名稱"]) || "";
        const price = num(page.properties["庫存售價"]) ?? 0;
        if (!name) return null;
        // notion_id 去 dash 存 32 字元（跟 products.notion_id 同格式）
        const notionId = String(page.id).replace(/-/g, "");
        return { name, price: String(price), notion_id: notionId };
      } catch { return null; }
    })
  )).filter((x): x is { name: string; price: string; notion_id: string } => x !== null);

  // 基本票價 = 最低票種價；沒票種就看 DB04 單價 fallback
  const basePrice = tickets.length > 0
    ? Math.min(...tickets.map(t => Number(t.price) || 0))
    : (num(props["單價"]) || 0);

  // 計算活動時長：end - start（分鐘）；只有單一日期時預設 120 分鐘（2小時）
  const durationMin = dateInfo.start && dateInfo.end
    ? Math.round((new Date(dateInfo.end).getTime() - new Date(dateInfo.start).getTime()) / 60000)
    : (dateInfo.start ? 120 : null);

  const row = {
    notion_id: nid,
    title: tx(props["主題名稱"]) || t(props["交接名稱"]) || "未命名活動",
    theme: sel(props["活動類型"]),
    event_type: sel(props["活動類型"]),
    event_date: dateInfo.start || null,
    duration_min: durationMin,
    distance_km: num(props["距離(km)"]) ?? null,
    price: basePrice,
    tickets,
    capacity: num(props["數量上限"]),
    min_capacity: num(props["最低數量"]),
    cover_url: fileUrl(props["上傳檔案"]),
    description: tx(props["簡介摘要"]),
    location: locationName,
    guide: guideName,
    related_partner_ids: relatedPartnerIds.length > 0 ? relatedPartnerIds : null,
    event_category: sel(props["交接類型"]) || null,   // 專案協作 / 常規活動 etc
    collab_type:    sel(props["協作選項"]) || null,   // 活動辦理 / 空間借用 etc
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" }),
  };
  if (row.status === null) return { table: "events", title: row.title, status: null, skipped: true };
  const { error } = await supabase.from("events").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`events upsert: ${error.message}`);
  // 回寫在主函式統一處理（非阻塞）
  return { table: "events", title: row.title, status: row.status };
}

// ── DB05 分流：文章 / 庫存批次 / 預約報名 ──
async function syncSingleDB05(nid: string, props: any) {
  const formType = sel(props["表單類型"]);
  const stockAction = sel(props["庫存選項"]);  // 進貨 / 出貨 / 盤點（2026/04/22 改為用庫存選項判斷）
  const copyDetail = sel(props["文案細項"]);
  const registerOption = sel(props["登記選項"]);

  // 庫存批次：表單類型=共識互動 + 庫存選項有值（進貨/出貨/盤點）
  if (formType === "共識互動" && stockAction) {
    return await syncStockBatch(nid, props);
  }

  // V2：登記選項=預約報名 → 按「發佈更新」時檢查錄取狀態 → 推 LINE + 錄取時才建交易紀錄
  // （表單類型固定為「報名登記」，用 登記選項 區分 reservation / direct）
  if (registerOption === "預約報名") {
    return await syncSingleReservation(nid, props);
  }

  // 官網文章：文案細項=官網內容
  if (copyDetail === "官網內容") {
    return await syncSingleArticle(nid, props);
  }

  // 其他類型不同步為文章
  return { table: "db05", note: `非官網內容（登記選項=${registerOption}, 表單類型=${formType}, 文案細項=${copyDetail}），跳過`, nid, skipped: true };
}

// 市集報名等沒有 Supabase order 的預約 → 靠 DB05 登記信箱找 LINE UID 推通知
async function pushMarketAdmissionByEmail(nid: string, props: any, admissionStatus: string, result: "accepted" | "rejected") {
  const { lineClient } = await import("@/lib/line");
  const emailRaw = tx(props["登記信箱"]) || "";
  const email = emailRaw.trim().toLowerCase();
  const title = t(props["表單名稱"]) || "您的報名";

  if (!email) {
    return { table: "reservation", note: "DB05 無登記信箱，略過 LINE 推播", nid, skipped: true };
  }

  const { data: member } = await supabase
    .from("members")
    .select("line_uid")
    .eq("email", email)
    .maybeSingle();

  if (!member?.line_uid) {
    return { table: "reservation", note: `找不到 LINE 綁定（email=${email}）`, nid, skipped: true };
  }

  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://makesense.ink").trim().replace(/\/$/, "");
  const vendorUrl = `${SITE}/buy/vendor-${nid.replace(/-/g, "")}`;

  const text = result === "accepted"
    ? `✅ 報名結果通知\n\n恭喜！您的「${title}」已錄取。\n\n📣 您的預購分享頁已上線：\n${vendorUrl}\n\n可以分享到 FB / IG / 自己客群讓民眾事先下單，\n市集當天現場交付即可（無需平台收款）。`
    : `📣 報名結果通知\n\n很抱歉，您的「${title}」這次未錄取。\n若有收取保證金將退回原帳戶。歡迎下次再報名 🙏`;

  try {
    await lineClient.pushMessage({
      to: member.line_uid,
      messages: [{ type: "text" as const, text }],
    });
  } catch (e: any) {
    return { table: "reservation", note: `LINE 推播失敗：${e.message}`, nid, skipped: true };
  }

  return { table: "reservation", admissionStatus, result, nid, linePushed: true, note: "market 路徑已推 LINE" };
}

// ── V2：DB05 預約報名 → 錄取時建庫存紀錄+扣庫存+LINE；未錄取時標記退款+LINE ──
async function syncSingleReservation(nid: string, props: any) {
  const admissionStatus = st(props["錄取狀態"]);  // status 欄位：錄取 / 未錄取 / 無關錄取

  let result: "accepted" | "rejected" | null = null;
  if (admissionStatus === "錄取") result = "accepted";
  else if (admissionStatus === "未錄取") result = "rejected";

  if (!result) {
    return { table: "reservation", note: `錄取狀態=${admissionStatus || "空"}，跳過`, nid, skipped: true };
  }

  // V2：用 DB05 notion_id 精確匹配訂單，同時撈 confirmed_db05_notion_id 做冪等
  const { data: order } = await supabase
    .from("orders")
    .select("id, member_id, admission_notified_status, confirmed_db05_notion_id")
    .eq("notion_db05_id", nid)
    .maybeSingle();

  if (!order) {
    // 市集報名等非購物車流程沒有 Supabase order → 直接依 DB05 登記信箱推 LINE
    return await pushMarketAdmissionByEmail(nid, props, admissionStatus, result);
  }

  // 防重複：已通知過相同狀態就跳過
  if (order.admission_notified_status === admissionStatus) {
    return {
      table: "reservation",
      orderId: order.id,
      admissionStatus,
      note: "已通知過相同狀態，跳過",
      nid,
      skipped: true,
    };
  }

  const db05PageIdDashed = nid.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  const outcome = await processAdmission({
    db05PageId: db05PageIdDashed,
    result,
    orderId: order.id,
    db05Page: { properties: props },
    memberId: order.member_id,
    existingConfirmedDb05: order.confirmed_db05_notion_id,
  });

  // 更新 orders：通知狀態、交易 DB05 id、訂單狀態、退款狀態
  const orderUpdates: Record<string, any> = {
    admission_notified_status: admissionStatus,
    status: result === "accepted" ? "confirmed" : "cancelled",
  };
  if (outcome.confirmedDb05NotionId && !order.confirmed_db05_notion_id) {
    orderUpdates.confirmed_db05_notion_id = outcome.confirmedDb05NotionId;
  }
  if (outcome.refundStatus) {
    orderUpdates.refund_status = outcome.refundStatus;
  }
  await supabase.from("orders").update(orderUpdates).eq("id", order.id);

  return {
    table: "reservation",
    orderId: order.id,
    admissionStatus,
    result,
    linePushed: outcome.linePushed,
    confirmedDb05NotionId: outcome.confirmedDb05NotionId,
    stockDecremented: outcome.stockDecremented,
    refundStatus: outcome.refundStatus,
    memberId: outcome.memberId,
    nid,
  };
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

  // 對應對象 relation → DB08 notion_ids（用於廠商後台「地方通訊」配對）
  const partnerRels = rel(props["對應對象"]);
  const relatedPartnerIds = partnerRels.map((id: string) => id.replace(/-/g, "")).filter(Boolean);

  // 對應協作 relation → events
  const eRels = rel(props["對應協作"]);
  let relatedEventId: string | null = null;
  if (eRels[0]) {
    const eClean = eRels[0].replace(/-/g, "");
    const { data } = await supabase.from("events").select("id").eq("notion_id", eClean).maybeSingle();
    relatedEventId = data?.id || null;
  }

  // 對應庫存 relation → products
  //   related_product_id：第一筆（付費文章解鎖用）
  //   related_product_ids：全部商品 id 陣列（話題推薦一對多用）
  const pRels = rel(props["對應庫存"]);
  let relatedProductId: string | null = null;
  let relatedProductIds: string[] = [];
  if (pRels.length > 0) {
    const cleanIds = pRels.map((r) => r.replace(/-/g, ""));
    const { data: prodRows } = await supabase
      .from("products")
      .select("id, notion_id")
      .in("notion_id", cleanIds);
    const byNid = new Map((prodRows || []).map((r: any) => [r.notion_id, r.id]));
    relatedProductIds = cleanIds.map((c) => byNid.get(c)).filter(Boolean) as string[];
    relatedProductId = relatedProductIds[0] || null;
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
    summary: tx(props["簡介摘要"]),
    cover_url: fileUrl(props["上傳檔案"]),
    related_event_id: relatedEventId,
    related_product_id: relatedProductId,
    related_product_ids: relatedProductIds,
    related_partner_ids: relatedPartnerIds.length > 0 ? relatedPartnerIds : null,
    // 2026/04/22：官網備項是 select（單值），包成 text[] 以便未來擴展
    web_tag: (() => {
      const v = extractSelect(props["官網備項"]?.select);
      return v ? [v] : null;
    })(),
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "published", "待發佈": "published" }),
    published_at: dateInfo.start || null,
  };
  if (content) row.content = content;

  if (row.status === null) return { table: "articles", title: row.title, status: null, skipped: true };
  const { error } = await supabase.from("articles").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`articles upsert: ${error.message}`);
  // 回寫在主函式統一處理（非阻塞）
  return { table: "articles", title: row.title, status: row.status, hasContent: !!content, webTag: row.web_tag };
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
  // publisher_notion_id：直接存 DB08 notion_id（不管是 persons/partners/staff 都能查）
  const publisherNotionId = pubRels[0] ? pubRels[0].replace(/-/g, "") : null;

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
    barcode: tx(props["商品ID"]),  // 商品 ID 直接當條碼用（ISBN/EAN）
    name: t(props["庫存名稱"]) || "未命名",
    category: sub ? `${cat}/${sub}` : cat,
    price: num(props["庫存售價"]) || 0,
    stock: num(props["庫存總計"]) || 0,
    description: tx(props["簡介摘要"]),
    images: JSON.stringify(fileUrls(props["產品照片"])),
    author_id: authorId,
    publisher_id: publisherId,
    publisher_notion_id: publisherNotionId,
    sub_category: sub || null,
    supplier_type: sel(props["進貨屬性"]) || null,
    related_topic_ids: JSON.stringify(relatedTopicIds),
    related_article_ids: JSON.stringify(relatedArticleIds),
    status: mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" }),
    page_status: st(props["頁面狀態"]) || "無頁面",
  };
  if (row.status === null) return { table: "products", title: row.name, status: null, skipped: true };
  const { error } = await supabase.from("products").upsert(row, { onConflict: "notion_id" });
  if (error) throw new Error(`products upsert: ${error.message}`);
  // 回寫在主函式統一處理（非阻塞）
  return { table: "products", title: row.name, status: row.status };
}

// ── DB08 → persons / topics / partners / members / staff ──
// 新規則（2026/04/22）：
// - topics:   經營類型 IN (觀點, 標籤)
// - persons:  會員狀態=會員 AND 關係選項=個人
// - partners: 會員狀態=會員 AND 關係選項=合作夥伴
// - staff:    會員狀態=會員 AND 關係選項=工作團隊
// - members:  會員狀態=會員（不論 關係選項）
// 同一筆 DB08 page 可能同時滿足多個條件（例如帶路老師：經營類型=觀點 + 關係選項=個人），一起寫
async function syncSingleRelation(nid: string, props: any) {
  const category = sel(props["經營類型"]);           // 觀點 / 標籤 / 紀錄
  const relation = sel(props["關係選項"]);           // 個人 / 合作夥伴 / 工作團隊（原「對象選項」2026/04/22 改名）
  const isMember = st(props["會員狀態"]) === "會員";
  const status = mapStatus(st(props["發佈狀態"]), { "已發佈": "active", "待發佈": "active" });

  const results: any[] = [];

  // ── 寫入 topics（經營類型 IN 觀點, 標籤）──
  if (category === "觀點" || category === "標籤") {
    let content: string | null = null;
    try {
      const pageId = nid.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
      content = await getPageContent(pageId);
      if (content && content.trim().length === 0) content = null;
    } catch (e: any) {
      console.warn("topic content fetch failed:", e.message);
    }

    // 2026/04/24：DB08「觀點」要在 cultureclub 首頁呈現相關卡片（產品/活動/文章/標籤）
    // 讀取 4 個 relation → 反查 Supabase 取對應 UUID（未同步的會自動跳過）
    const resolveIds = async (table: string, notionRelIds: string[]): Promise<string[]> => {
      if (!notionRelIds.length) return [];
      const cleanIds = notionRelIds.map((id) => id.replace(/-/g, ""));
      const { data } = await supabase.from(table).select("id, notion_id").in("notion_id", cleanIds);
      const byNid = new Map((data || []).map((r: any) => [r.notion_id, r.id]));
      return cleanIds.map((c) => byNid.get(c)).filter(Boolean) as string[];
    };
    const [relatedProductIds, relatedEventIds, relatedArticleIds, relatedTagIds] = await Promise.all([
      resolveIds("products", rel(props["對應標籤庫存"])),
      resolveIds("events",   rel(props["對應標籤協作"])),
      resolveIds("articles", rel(props["對應標籤表單"])),
      resolveIds("topics",   rel(props["自對標籤"])),
    ]);

    const row: Record<string, any> = {
      notion_id: nid,
      name: t(props["經營名稱"]) || "未命名",
      tag_type: category === "觀點" ? "viewpoint" : "tag",
      summary: tx(props["簡介摘要"]),
      cover_url: fileUrl(props["上傳檔案"]),
      region: (() => {
        const ms = extractMultiSelect(props["行政區域"]?.multi_select);
        if (ms && ms.length) return ms;
        const s = extractSelect(props["行政區域"]?.select);
        return s ? [s] : [];
      })(),
      related_product_ids: relatedProductIds,
      related_event_ids: relatedEventIds,
      related_article_ids: relatedArticleIds,
      related_tag_ids: relatedTagIds,
      status,
    };
    if (content) row.content = content;

    if (status !== null) {
      const { error } = await supabase.from("topics").upsert(row, { onConflict: "notion_id" });
      if (error) throw new Error(`topics upsert: ${error.message}`);
      results.push({ table: "topics", title: row.name, status, hasContent: !!content });
    } else {
      results.push({ table: "topics", title: row.name, status: null, skipped: true });
    }
  }

  // ── 寫入 members + persons/partners/staff（需 會員狀態=會員）──
  if (isMember) {
    const name = t(props["經營名稱"]) || "未命名";
    const email = tx(props["Email"]);

    // members（email 為主鍵，無 email 則跳過）
    if (email) {
      const memberRow = {
        email,
        name,
        phone: tx(props["電話"]),
        line_uid: tx(props["LINE_UID"]),
        member_type: relation,
      };
      const { error } = await supabase.from("members").upsert(memberRow, { onConflict: "email" });
      if (error) console.warn(`members upsert: ${error.message}`);
      else results.push({ table: "members", title: name, email });
    }

    // partners / staff / persons（依 關係選項）
    if (relation === "合作夥伴") {
      const row = {
        notion_id: nid,
        type: sel(props["單位選項"]) || "民間單位",
        name,
        contact: {
          email,
          phone: tx(props["電話"]),
          address: tx(props["地址"]),
          contactPerson: tx(props["聯絡人"]),
        },
        status,
      };
      if (status !== null) {
        const { error } = await supabase.from("partners").upsert(row, { onConflict: "notion_id" });
        if (error) throw new Error(`partners upsert: ${error.message}`);
        results.push({ table: "partners", title: name, status });
      }
    } else if (relation === "工作團隊") {
      const row = {
        notion_id: nid,
        name,
        role: sel(props["職級細項"]),
      };
      const { error } = await supabase.from("staff").upsert(row, { onConflict: "notion_id" });
      if (error) throw new Error(`staff upsert: ${error.message}`);
      results.push({ table: "staff", title: name, status: "active" });
    } else if (relation === "個人") {
      const row = {
        notion_id: nid,
        type: relation,
        name,
        bio: tx(props["簡介摘要"]),
        contact: {
          email,
          phone: tx(props["電話"]),
          address: tx(props["地址"]),
          contactPerson: tx(props["聯絡人"]),
        },
        links: {
          fb: url(props["FB粉專"]),
          ig: url(props["IG粉專"]),
          website: url(props["官網ID"]),
        },
        status,
      };
      if (status !== null) {
        const { error } = await supabase.from("persons").upsert(row, { onConflict: "notion_id" });
        if (error) throw new Error(`persons upsert: ${error.message}`);
        results.push({ table: "persons", title: name, status });
      }
    }
  }

  if (results.length === 0) {
    return { table: "unknown", note: `經營類型=${category}, 關係選項=${relation}, 會員狀態=${isMember ? "會員" : "非會員"}，無對應同步邏輯`, nid };
  }
  // 返回第一筆結果（向下相容），並在 note 裡列出所有寫入的表
  return results.length === 1 ? results[0] : { ...results[0], also: results.slice(1).map(r => r.table) };
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
