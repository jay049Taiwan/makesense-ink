import { supabase } from "./supabase";

// ═══════════════════════════════════════════
// 多語言翻譯覆蓋工具
// ═══════════════════════════════════════════

/**
 * 批次覆蓋翻譯到查詢結果上
 * 用法：const products = await applyTranslations(await fetchSBProducts(), "products", locale, ["name", "description"]);
 */
export async function applyTranslations<T extends { id: string }>(
  rows: T[],
  tableName: string,
  locale: string,
  fields: string[]
): Promise<T[]> {
  if (locale === "zh" || rows.length === 0) return rows;

  // 需要用 Supabase UUID 查翻譯，但 rows 裡的 id 可能是 notion_id
  // 先查出 notion_id → uuid 映射
  const notionIds = rows.map(r => r.id);
  const { data: mapping } = await supabase
    .from(tableName)
    .select("id, notion_id")
    .in("notion_id", notionIds);

  const notionToUuid: Record<string, string> = {};
  for (const m of mapping || []) {
    if (m.notion_id) notionToUuid[m.notion_id] = m.id;
  }

  const uuids = notionIds.map(nid => notionToUuid[nid] || nid);

  // 批次取翻譯
  const { data: translations } = await supabase
    .from("translations")
    .select("row_id, field, value")
    .eq("table_name", tableName)
    .eq("locale", locale)
    .in("row_id", uuids);

  if (!translations || translations.length === 0) return rows;

  // 建立翻譯 map: uuid → { field: value }
  const tMap: Record<string, Record<string, string>> = {};
  for (const t of translations) {
    if (!tMap[t.row_id]) tMap[t.row_id] = {};
    tMap[t.row_id][t.field] = t.value;
  }

  // 覆蓋
  return rows.map(row => {
    const uuid = notionToUuid[row.id] || row.id;
    const t = tMap[uuid];
    if (!t) return row;
    const copy = { ...row };
    for (const field of fields) {
      if (t[field]) (copy as any)[field] = t[field];
    }
    return copy;
  });
}

// ═══════════════════════════════════════════
// Products（商品）from Supabase
// ═══════════════════════════════════════════
export interface SBProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string | null;
  images: string;
  author_name: string | null;
  publisher_name: string | null;
  status: string;
}

export async function fetchSBProducts(subCategory?: string, limit = 12) {
  let query = supabase
    .from("products")
    .select("id, notion_id, name, price, stock, category, description, images, status, author_id, publisher_id")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (subCategory) {
    query = query.ilike("category", `%${subCategory}%`);
  } else {
    // 公開頁面只顯示選書、選物、數位，隱藏票券、加購折價、獎禮品等
    query = query.or("category.eq.商品/選書,category.eq.商品/選物,category.eq.商品/數位");
  }

  const { data, error } = await query;
  if (error) { console.error("fetchSBProducts err:", error); return []; }

  // Batch resolve author/publisher names
  const authorIds = [...new Set((data || []).map(p => p.author_id).filter(Boolean))];
  const publisherIds = [...new Set((data || []).map(p => p.publisher_id).filter(Boolean))];
  const allPersonIds = [...new Set([...authorIds, ...publisherIds])];

  let personMap: Record<string, string> = {};
  if (allPersonIds.length > 0) {
    const { data: persons } = await supabase
      .from("persons")
      .select("id, name")
      .in("id", allPersonIds);
    for (const p of persons || []) personMap[p.id] = p.name;
  }

  return (data || []).map(p => ({
    id: p.notion_id || p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    description: p.description,
    photo: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || null; } catch { return null; } })(),
    author: p.author_id ? (personMap[p.author_id] || "—") : "—",
    publisher: p.publisher_id ? (personMap[p.publisher_id] || "—") : "—",
    slug: p.notion_id || p.id,
  }));
}

/** 自營產品：發行商為旅人書店/現思文化/宜蘭文化俱樂部 */
const OWN_BRAND_NAMES = ["旅人書店", "現思文化創藝術有限公司", "宜蘭文化俱樂部"];

export async function fetchSBOwnProducts(limit = 24) {
  // 先查三個自家品牌的 persons.id
  const { data: brands } = await supabase
    .from("persons")
    .select("id, name")
    .in("name", OWN_BRAND_NAMES);

  const brandIds = (brands || []).map(b => b.id);
  if (brandIds.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, notion_id, name, price, stock, category, description, images, status, publisher_id")
    .eq("status", "active")
    .in("publisher_id", brandIds)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) { console.error("fetchSBOwnProducts err:", error); return []; }

  const brandMap: Record<string, string> = {};
  for (const b of brands || []) brandMap[b.id] = b.name;

  return (data || []).map(p => ({
    id: p.notion_id || p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    description: p.description,
    photo: (() => { try { const imgs = JSON.parse(p.images || "[]"); return imgs[0] || null; } catch { return null; } })(),
    publisher: p.publisher_id ? (brandMap[p.publisher_id] || "—") : "—",
    slug: p.notion_id || p.id,
  }));
}

// ═══════════════════════════════════════════
// Events（活動）from Supabase
// ═══════════════════════════════════════════
export async function fetchSBEvents(limit = 10) {
  // 先抓未來活動，不夠再補最近的過去活動
  const now = new Date().toISOString();
  let { data, error } = await supabase
    .from("events")
    .select("id, notion_id, title, theme, event_date, price, capacity, cover_url, description, status")
    .eq("status", "active")
    .gte("event_date", now)
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) { console.error("fetchSBEvents err:", error); return []; }

  // 未來活動不夠時，補最近的過去活動
  if ((data || []).length < limit) {
    const remaining = limit - (data || []).length;
    const { data: past } = await supabase
      .from("events")
      .select("id, notion_id, title, theme, event_date, price, capacity, cover_url, description, status")
      .eq("status", "active")
      .lt("event_date", now)
      .order("event_date", { ascending: false })
      .limit(remaining);
    data = [...(data || []), ...(past || [])];
  }

  if (error) { console.error("fetchSBEvents err:", error); return []; }
  return (data || []).map(e => ({
    id: e.notion_id || e.id,
    title: e.title,
    theme: e.theme,
    date: e.event_date,
    price: e.price,
    capacity: e.capacity,
    cover_url: e.cover_url,
    description: e.description,
    slug: e.notion_id || e.id,
  }));
}

export async function fetchSBAllEvents(limit = 100) {
  const { data, error } = await supabase
    .from("events")
    .select("id, notion_id, title, theme, event_date, price, capacity, cover_url, description, status")
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) { console.error("fetchSBAllEvents err:", error); return []; }
  return (data || []).map(e => ({
    id: e.notion_id || e.id,
    title: e.title,
    theme: e.theme,
    date: e.event_date,
    price: e.price,
    status: e.status,
    slug: e.notion_id || e.id,
  }));
}

// ═══════════════════════════════════════════
// Articles（文章）from Supabase
// ═══════════════════════════════════════════
export async function fetchSBArticles(limit = 10) {
  const { data, error } = await supabase
    .from("articles")
    .select("id, notion_id, title, cover_url, published_at, status")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) { console.error("fetchSBArticles err:", error); return []; }
  return (data || []).map(a => ({
    id: a.notion_id || a.id,
    title: a.title,
    cover_url: a.cover_url,
    date: a.published_at,
    slug: a.notion_id || a.id,
  }));
}

// ═══════════════════════════════════════════
// Topics（觀點/標籤）from Supabase
// ═══════════════════════════════════════════
export async function fetchSBTopics(tagType?: "tag" | "viewpoint", limit = 20) {
  let query = supabase
    .from("topics")
    .select("id, notion_id, name, tag_type, summary, status")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (tagType) query = query.eq("tag_type", tagType);

  const { data, error } = await query;
  if (error) { console.error("fetchSBTopics err:", error); return []; }
  return (data || []).map(t => ({
    id: t.notion_id || t.id,
    name: t.name,
    tag_type: t.tag_type,
    summary: t.summary,
    slug: t.notion_id || t.id,
  }));
}

// ═══════════════════════════════════════════
// Partners（合作夥伴）from Supabase
// ═══════════════════════════════════════════
export async function fetchSBPartners(limit = 20) {
  const { data, error } = await supabase
    .from("partners")
    .select("id, notion_id, name, type, contact, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) { console.error("fetchSBPartners err:", error); return []; }
  return (data || []).map(p => ({
    id: p.notion_id || p.id,
    name: p.name,
    type: p.type,
    contact: p.contact,
    slug: p.notion_id || p.id,
  }));
}

// ═══════════════════════════════════════════
// Persons（人物）from Supabase
// ═══════════════════════════════════════════
export async function fetchSBPersons(type?: string, limit = 20) {
  let query = supabase
    .from("persons")
    .select("id, notion_id, name, type, bio, links, status")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) { console.error("fetchSBPersons err:", error); return []; }
  return (data || []).map(p => ({
    id: p.notion_id || p.id,
    name: p.name,
    type: p.type,
    bio: p.bio,
    links: p.links,
    slug: p.notion_id || p.id,
  }));
}
