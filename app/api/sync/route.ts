import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, DB, extractTitle, extractText, extractSelect, extractDate, extractRelation, extractNumber, extractStatus, extractUrl, updatePage } from "@/lib/notion";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300; // Vercel timeout 5 min

/**
 * POST /api/sync — Notion → Supabase 全量同步
 */
export async function POST(req: NextRequest) {
  const doWriteback = req.nextUrl.searchParams.get("writeback") === "true";
  const results: Record<string, { upserted: number; errors: number }> = {};

  try {
    results.persons = await syncPersons();
    results.topics = await syncTopics();
    results.partners = await syncPartners();
    results.members = await syncMembers();
    results.staff = await syncStaff();
    results.products = await syncProducts(doWriteback);
    results.events = await syncEvents(doWriteback);
    results.articles = await syncArticles(doWriteback);
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

/** 回寫 Notion：更新發佈狀態 + 對應連結（只在對應連結為空時才寫） */
async function writeback(page: any, url: string, statusField: string, statusValue: string, urlField: string) {
  try {
    const existingUrl = page.properties?.[urlField]?.url;
    if (existingUrl) return; // 已有 URL，跳過
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
  const { data } = await supabase.from(table).select("id, notion_id").in("notion_id", clean);
  const m: Record<string, string> = {};
  for (const r of data || []) m[r.notion_id] = r.id;
  return m;
}

// ── DB08 → persons ──
async function syncPersons() {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "經營類型", select: { equals: "連結對象" } });

  for (const page of pages) {
    try {
      const props = p(page);
      const { error } = await supabase.from("persons").upsert({
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
        status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "已完成": "active", "待發佈": "draft", "進行中": "draft", "不發佈": "inactive" }),
      }, { onConflict: "notion_id" });
      if (error) { console.error("persons err:", error.message); errors++; } else upserted++;
    } catch (e: any) { console.error("persons ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB08 → topics ──
async function syncTopics() {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "經營類型", select: { equals: "主題標籤" } });

  for (const page of pages) {
    try {
      const props = p(page);
      const { error } = await supabase.from("topics").upsert({
        notion_id: nid(page),
        name: extractTitle(props["經營名稱"]?.title) || "未命名",
        tag_type: ms(extractStatus(props["觀點狀態"]?.status), { "標籤": "tag", "觀點": "viewpoint" }) || "tag",
        summary: extractText(props["簡介摘要"]?.rich_text) || null,
        status: ms(extractStatus(props["觀點專頁"]?.status) || extractStatus(props["觀點狀態"]?.status), { "已完成": "active", "進行中": "draft" }),
      }, { onConflict: "notion_id" });
      if (error) { console.error("topics err:", error.message); errors++; } else upserted++;
    } catch (e: any) { console.error("topics ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB08 → partners ──
async function syncPartners() {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, {
    and: [
      { property: "經營類型", select: { equals: "連結對象" } },
      { property: "對象選項", select: { equals: "合作單位" } },
    ],
  });

  for (const page of pages) {
    try {
      const props = p(page);
      const { error } = await supabase.from("partners").upsert({
        notion_id: nid(page),
        type: extractSelect(props["單位選項"]?.select) || "民間單位",
        name: extractTitle(props["經營名稱"]?.title) || "未命名",
        contact: {
          email: extractText(props["Email"]?.rich_text) || null,
          phone: extractText(props["電話"]?.rich_text) || null,
          address: extractText(props["地址"]?.rich_text) || null,
          contactPerson: extractText(props["聯絡人"]?.rich_text) || null,
        },
        status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "active", "已完成": "active", "待發佈": "draft", "不發佈": "inactive" }),
      }, { onConflict: "notion_id" });
      if (error) { console.error("partners err:", error.message); errors++; } else upserted++;
    } catch (e: any) { console.error("partners ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB08 → members ──
async function syncMembers() {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "會員狀態", status: { equals: "會員" } });

  for (const page of pages) {
    try {
      const props = p(page);
      const email = extractText(props["Email"]?.rich_text);
      if (!email) continue;
      const { error } = await supabase.from("members").upsert({
        email,
        name: extractTitle(props["經營名稱"]?.title) || null,
        phone: extractText(props["電話"]?.rich_text) || null,
        line_uid: extractText(props["LINE_UID"]?.rich_text) || null,
        member_type: extractSelect(props["對象選項"]?.select) || null,
      }, { onConflict: "email" });
      if (error) { console.error("members err:", error.message); errors++; } else upserted++;
    } catch (e: any) { console.error("members ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB08 → staff ──
async function syncStaff() {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB08_RELATIONSHIP, { property: "對象選項", select: { equals: "工作團隊" } });

  for (const page of pages) {
    try {
      const props = p(page);
      const { error } = await supabase.from("staff").upsert({
        notion_id: nid(page),
        name: extractTitle(props["經營名稱"]?.title) || "未命名",
        role: extractSelect(props["職級細項"]?.select) || null,
      }, { onConflict: "notion_id" });
      if (error) { console.error("staff err:", error.message); errors++; } else upserted++;
    } catch (e: any) { console.error("staff ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB07 → products ──
async function syncProducts(wb = false) {
  let upserted = 0, errors = 0;
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

  for (const page of pages) {
    try {
      const props = p(page);
      const authorRel = extractRelation(props["對應作者"]?.relation);
      const pubRel = extractRelation(props["對應發行"]?.relation);
      const aNid = authorRel[0]?.replace(/-/g, "");
      const pNid = pubRel[0]?.replace(/-/g, "");
      const cat = extractSelect(props["庫存類型"]?.select) || "";
      const sub = extractSelect(props["商品選項"]?.select) || "";

      const { error } = await supabase.from("products").upsert({
        notion_id: nid(page),
        sku: extractText(props["商品ID"]?.rich_text) || null,
        name: extractTitle(props["庫存名稱"]?.title) || "未命名",
        category: sub ? `${cat}/${sub}` : cat,
        price: extractNumber(props["庫存售價"]?.number) || 0,
        stock: extractNumber(props["庫存總計"]?.number) || extractNumber(props["庫存總計"]?.formula?.number) || 0,
        description: extractText(props["產品介紹"]?.rich_text) || null,
        images: JSON.stringify(fileUrls(props["產品照片"])),
        author_id: aNid ? (aMap[aNid] || null) : null,
        publisher_id: pNid ? (pMap[pNid] || null) : null,
        status: ms(extractStatus(props["銷售狀態"]?.status), { "已更新": "active", "無販售": "inactive", "維護中": "draft" }),
      }, { onConflict: "notion_id" });
      if (error) { console.error("products err:", error.message); errors++; }
      else { upserted++; if (wb) await writeback(page, `${SITE_URL}/product/${nid(page)}`, "發佈狀態", "已發佈", "對應連結"); }
    } catch (e: any) { console.error("products ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB04 → events ──
async function syncEvents(wb = false) {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB04_COLLABORATION, { property: "協作選項", select: { equals: "活動辦理" } });

  // 批次反查「對應地點」和「對應對象」relation → persons 表拿名字
  const locIds: string[] = [], guideIds: string[] = [];
  for (const page of pages) {
    const props = p(page);
    locIds.push(...extractRelation(props["對應地點"]?.relation));
    guideIds.push(...extractRelation(props["對應對象"]?.relation));
  }
  const locMap = await lookup("persons", locIds);
  const guideMap = await lookup("persons", guideIds);

  // 批次取 persons name
  const allPersonIds = [...new Set([...Object.values(locMap), ...Object.values(guideMap)])];
  let personNameMap: Record<string, string> = {};
  if (allPersonIds.length > 0) {
    const { data: persons } = await supabase.from("persons").select("id, name").in("id", allPersonIds);
    for (const pr of persons || []) personNameMap[pr.id] = pr.name;
  }

  for (const page of pages) {
    try {
      const props = p(page);
      const dateInfo = extractDate(props["執行時間"]?.date);

      // 對應地點：relation → persons → name
      const locRel = extractRelation(props["對應地點"]?.relation);
      const locNid = locRel[0]?.replace(/-/g, "");
      const locUuid = locNid ? locMap[locNid] : undefined;
      const locationName = locUuid ? (personNameMap[locUuid] || null) : null;

      // 對應對象（帶路人/講師）：relation → persons → name
      const guideRel = extractRelation(props["對應對象"]?.relation);
      const guideNid = guideRel[0]?.replace(/-/g, "");
      const guideUuid = guideNid ? guideMap[guideNid] : undefined;
      const guideName = guideUuid ? (personNameMap[guideUuid] || null) : null;

      const { error } = await supabase.from("events").upsert({
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
        status: ms(extractStatus(props["執行狀態"]?.status), { "執行中": "active", "已完成": "completed", "無執行": "draft" }),
      }, { onConflict: "notion_id" });
      if (error) { console.error("events err:", error.message); errors++; }
      else { upserted++; if (wb) await writeback(page, `${SITE_URL}/events/${nid(page)}`, "發佈狀態", "已發佈", "對應連結"); }
    } catch (e: any) { console.error("events ex:", e.message); errors++; }
  }
  return { upserted, errors };
}

// ── DB05 → articles ──
async function syncArticles(wb = false) {
  let upserted = 0, errors = 0;
  const pages = await queryDatabase(DB.DB05_REGISTRATION, { property: "表單類型", select: { equals: "圖文影音" } });

  const eIds: string[] = [];
  for (const page of pages) { eIds.push(...extractRelation(p(page)["對應協作"]?.relation)); }
  const eMap = await lookup("events", eIds);

  for (const page of pages) {
    try {
      const props = p(page);
      const dateInfo = extractDate(props["執行時間"]?.date);
      const eRel = extractRelation(props["對應協作"]?.relation);
      const eNid = eRel[0]?.replace(/-/g, "");

      const articleUrl = `${SITE_URL}/post/${nid(page)}`;
      const { error } = await supabase.from("articles").upsert({
        notion_id: nid(page),
        title: extractTitle(props["表單名稱"]?.title) || "未命名文章",
        cover_url: fileUrl(props["上傳檔案"]) || null,
        related_event_id: eNid ? (eMap[eNid] || null) : null,
        status: ms(extractStatus(props["發佈狀態"]?.status), { "已發佈": "published", "發佈更新": "published", "已完成": "published", "待發佈": "draft", "草稿": "draft" }),
        published_at: dateInfo.start || null,
      }, { onConflict: "notion_id" });
      if (error) { console.error("articles err:", error.message); errors++; }
      else { upserted++; if (wb) await writeback(page, articleUrl, "發佈狀態", "已發佈", "對應連結"); }
    } catch (e: any) { console.error("articles ex:", e.message); errors++; }
  }
  return { upserted, errors };
}
