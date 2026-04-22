import { queryDatabase, getPage, extractTitle, extractText, extractSelect, extractNumber, extractDate, extractStatus, extractRelation, DB } from "./notion";
import { normalizeEmail } from "./email";

// 批次解析 relation IDs → DB08 經營名稱
export async function resolveRelationNames(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const page = await getPage(id) as any;
        const name = extractTitle(page.properties["經營名稱"]?.title);
        return [id, name] as const;
      } catch { return [id, ""] as const; }
    })
  );
  return Object.fromEntries(entries);
}

// ══════════════════════════════════════════
// DB01: 資源提案（合作單位用）
// ══════════════════════════════════════════
export interface Proposal {
  id: string;
  title: string;
  status: string;
  type: string;
  created: string;
}

export async function fetchProposals(supplierName: string, limit = 30): Promise<Proposal[]> {
  try {
    const results = await queryDatabase(
      DB.DB01_RESOURCE,
      { property: "專案名稱", title: { contains: supplierName } },
      [{ timestamp: "created_time", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => ({
      id: page.id,
      title: extractTitle(page.properties["專案名稱"]?.title),
      status: extractStatus(page.properties["執行狀態"]?.status) || "",
      type: extractSelect(page.properties["提案類型"]?.select) || "",
      created: page.created_time?.substring(0, 10) || "",
    }));
  } catch (e) { console.error("fetchProposals error:", e); return []; }
}

// ══════════════════════════════════════════
// DB02: 績效管考（營運儀表板用）
// ══════════════════════════════════════════
export interface PerformanceRecord {
  id: string;
  title: string;
  status: string;
}

export async function fetchPerformance(limit = 10): Promise<PerformanceRecord[]> {
  try {
    const results = await queryDatabase(DB.DB02_PERFORMANCE, undefined, undefined, limit);
    return results.map((page: any) => ({
      id: page.id,
      title: extractTitle(page.properties["管考名稱"]?.title),  // DB02 title = 管考名稱
      status: extractStatus(page.properties["執行狀態"]?.status) || "",
    }));
  } catch (e) { console.error("fetchPerformance error:", e); return []; }
}

// ══════════════════════════════════════════
// DB03: 工作項目進度（系列服務控制）
// ══════════════════════════════════════════
export interface WorkItem {
  id: string;
  title: string;
  status: string;
  publishStatus: string;
}

export async function fetchWorkItems(limit = 20): Promise<WorkItem[]> {
  try {
    const results = await queryDatabase(DB.DB03_PROGRESS, undefined, undefined, limit);
    return results.map((page: any) => ({
      id: page.id,
      title: extractTitle(page.properties["項目名稱"]?.title),
      status: extractStatus(page.properties["執行狀態"]?.status) || "",
      publishStatus: extractStatus(page.properties["發佈狀態"]?.status) || "",
    }));
  } catch (e) { console.error("fetchWorkItems error:", e); return []; }
}

// ══════════════════════════════════════════
// DB05: 登記表單明細（文章、報名紀錄）
// ══════════════════════════════════════════
export interface Registration {
  id: string;
  title: string;        // 表單名稱（DB05 的 title）
  topicTitle: string;   // 主題名稱
  content: string;      // 明細內容
  type: string;         // 表單類型（DB05 的 select）
  summary: string;      // 簡介摘要
  date: string | null;
  slug: string;
}

export async function fetchArticles(limit = 10): Promise<Registration[]> {
  try {
    const results = await queryDatabase(
      DB.DB05_REGISTRATION,
      {
        and: [
          { property: "文案細項", select: { equals: "官網內容" } },
        ],
      },
      [{ property: "建立時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractTitle(props["表單名稱"]?.title),
        topicTitle: extractText(props["主題名稱"]?.rich_text),
        content: extractText(props["明細內容"]?.rich_text),
        type: extractSelect(props["表單類型"]?.select) || "",
        summary: extractText(props["簡介摘要"]?.rich_text),
        date: page.created_time?.substring(0, 10) || null,
        slug: page.id.replace(/-/g, ""),
      };
    });
  } catch (e) { console.error("fetchArticles error:", e); return []; }
}

export async function fetchRegistrationsByEmail(email: string, limit = 50): Promise<Registration[]> {
  try {
    const results = await queryDatabase(
      DB.DB05_REGISTRATION,
      {
        and: [
          { property: "表單類型", select: { equals: "報名登記" } },
          // 實際上要用 relation 或 rollup 比對 email，這裡先用標題包含 email 做 fallback
        ],
      },
      [{ property: "建立時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractTitle(props["表單名稱"]?.title),
        topicTitle: extractText(props["主題名稱"]?.rich_text),
        content: "",
        type: extractSelect(props["表單類型"]?.select) || "",
        summary: "",
        date: page.created_time?.substring(0, 10) || null,
        slug: page.id.replace(/-/g, ""),
      };
    });
  } catch (e) { console.error("fetchRegistrationsByEmail error:", e); return []; }
}

// 用 notionId（DB08 page ID）查詢該會員在 DB05 的所有報名紀錄
export async function fetchRegistrationsByNotionId(notionId: string, limit = 50): Promise<Registration[]> {
  try {
    const results = await queryDatabase(
      DB.DB05_REGISTRATION,
      {
        and: [
          { property: "表單類型", select: { equals: "報名登記" } },
          { property: "對應對象", relation: { contains: notionId } },
        ],
      },
      [{ property: "建立時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractTitle(props["表單名稱"]?.title),
        topicTitle: extractText(props["主題名稱"]?.rich_text),
        content: extractText(props["明細內容"]?.rich_text),
        type: extractSelect(props["表單類型"]?.select) || "",
        summary: extractText(props["簡介摘要"]?.rich_text),
        date: page.created_time?.substring(0, 10) || null,
        slug: page.id.replace(/-/g, ""),
      };
    });
  } catch (e) { console.error("fetchRegistrationsByNotionId error:", e); return []; }
}

// ══════════════════════════════════════════
// DB06: 進銷明細（訂單明細）
// ══════════════════════════════════════════
export interface TransactionItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  date: string | null;
}

export async function fetchTransactions(limit = 50): Promise<TransactionItem[]> {
  try {
    const results = await queryDatabase(
      DB.DB06_TRANSACTION,
      undefined,
      [{ property: "建立時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractTitle(props["明細名稱"]?.title),  // DB06 title 是「明細名稱」
        price: extractNumber(props["登記售價"]?.number) || 0,
        quantity: extractNumber(props["檢查數量"]?.number) || 1,
        date: page.created_time?.substring(0, 10) || null,
      };
    });
  } catch (e) { console.error("fetchTransactions error:", e); return []; }
}

// ══════════════════════════════════════════
// DB08: 關係經營（關鍵字、觀點、會員、合作單位）
// ══════════════════════════════════════════
export interface KeywordItem {
  id: string;
  name: string;
  type: string;        // 經營類型：觀點 / 標籤（DB08，2026/04/22 新選項）
  summary: string;     // 簡介摘要
  slug: string;
}

export async function fetchKeywords(limit = 20): Promise<KeywordItem[]> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      {
        or: [
          { property: "經營類型", select: { equals: "觀點" } },
          { property: "經營類型", select: { equals: "標籤" } },
        ],
      },
      [{ property: "更新時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: extractTitle(props["經營名稱"]?.title),
        type: extractSelect(props["經營類型"]?.select) || "",
        summary: extractText(props["簡介摘要"]?.rich_text),
        slug: page.id.replace(/-/g, ""),
      };
    });
  } catch (e) { console.error("fetchKeywords error:", e); return []; }
}

export async function fetchPersonByEmail(email: string): Promise<KeywordItem | null> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "Email", rich_text: { equals: normalizeEmail(email) } },
      undefined,
      1
    );
    if (results.length === 0) return null;
    const page = results[0] as any;
    const props = page.properties;
    return {
      id: page.id,
      name: extractTitle(props["經營名稱"]?.title),
      type: extractSelect(props["經營類型"]?.select) || "",
      summary: extractText(props["簡介摘要"]?.rich_text),
      slug: page.id.replace(/-/g, ""),
    };
  } catch (e) { console.error("fetchPersonByEmail error:", e); return null; }
}

export async function checkMemberStatus(email: string): Promise<string | null> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "Email", rich_text: { equals: normalizeEmail(email) } },
      undefined,
      1
    );
    if (results.length === 0) return null;
    const props = (results[0] as any).properties;
    return extractStatus(props["會員狀態"]?.status) || null;
  } catch (e) { console.error("checkMemberStatus error:", e); return null; }
}

export async function fetchPersonByLineUid(lineUid: string): Promise<KeywordItem | null> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "LINE_UID", rich_text: { equals: lineUid.trim() } },
      undefined,
      1
    );
    if (results.length === 0) return null;
    const page = results[0] as any;
    const props = page.properties;
    return {
      id: page.id,
      name: extractTitle(props["經營名稱"]?.title),
      type: extractSelect(props["經營類型"]?.select) || "",
      summary: extractText(props["簡介摘要"]?.rich_text),
      slug: page.id.replace(/-/g, ""),
    };
  } catch (e) { console.error("fetchPersonByLineUid error:", e); return null; }
}

// 判斷是否為合作夥伴（DB08 會員狀態=會員 AND 關係選項=合作夥伴）
export async function checkIsVendor(email: string): Promise<boolean> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      {
        and: [
          { property: "Email", rich_text: { equals: normalizeEmail(email) } },
          { property: "會員狀態", status: { equals: "會員" } },
          { property: "關係選項", select: { equals: "合作夥伴" } },
        ],
      },
      undefined,
      1
    );
    return results.length > 0;
  } catch (e) { console.error("checkIsVendor error:", e); return false; }
}

export interface VendorProfile {
  id: string;
  name: string;
  email: string;
  since: string;
  phone: string;
  summary: string;
}

// 取得合作單位完整資料（DB08）
export async function fetchVendorProfile(email: string): Promise<VendorProfile | null> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "Email", rich_text: { equals: normalizeEmail(email) } },
      undefined,
      1
    );
    if (results.length === 0) return null;
    const page = results[0] as any;
    const props = page.properties;
    return {
      id: page.id,
      name: extractTitle(props["經營名稱"]?.title),
      email: extractText(props["Email"]?.rich_text),
      since: extractDate(props["建立時間"]?.date) || page.created_time?.substring(0, 10) || "",
      phone: extractText(props["電話"]?.rich_text) || "",  // 2026/04/17：「聯繫電話」不存在，統一用「電話」
      summary: extractText(props["簡介摘要"]?.rich_text),
    };
  } catch (e) { console.error("fetchVendorProfile error:", e); return null; }
}

// 判斷是否為工作人員（DB08 會員狀態=會員 AND 關係選項=工作團隊）
export async function checkIsStaff(email: string): Promise<boolean> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      {
        and: [
          { property: "Email", rich_text: { equals: normalizeEmail(email) } },
          { property: "會員狀態", status: { equals: "會員" } },
          { property: "關係選項", select: { equals: "工作團隊" } },
        ],
      },
      undefined,
      1
    );
    return results.length > 0;
  } catch (e) { console.error("checkIsStaff error:", e); return false; }
}

// ══════════════════════════════════════════
// DB09: 範圍日期（時間軸、發展歷程）
// ══════════════════════════════════════════
export interface DateRangeItem {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  description: string;
}

export async function fetchTimeline(limit = 100): Promise<DateRangeItem[]> {
  try {
    const results = await queryDatabase(
      DB.DB09_DATE_RANGE,
      undefined,
      [{ property: "起算日期", direction: "ascending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      const dateRange = props["起算日期"]?.date || props["範圍日期"]?.date;
      return {
        id: page.id,
        title: extractTitle(props["日期名稱"]?.title || props["範圍名稱"]?.title),
        start: dateRange?.start || null,
        end: dateRange?.end || null,
        description: extractText(props["簡介摘要"]?.rich_text),
      };
    });
  } catch (e) { console.error("fetchTimeline error:", e); return []; }
}
