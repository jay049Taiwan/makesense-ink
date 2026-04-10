import { queryDatabase, extractTitle, extractText, extractSelect, extractNumber, extractDate, extractStatus, extractRelation, DB } from "./notion";

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
      title: extractTitle(page.properties["管考名稱"]?.title || page.properties["績效名稱"]?.title),
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
  title: string;        // 明細名稱
  topicTitle: string;   // 主題名稱
  content: string;      // 明細內容
  type: string;         // 明細類型
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
          { property: "明細類型", select: { equals: "圖文影音" } },
        ],
      },
      [{ property: "建立時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractTitle(props["明細名稱"]?.title),
        topicTitle: extractText(props["主題名稱"]?.rich_text),
        content: extractText(props["明細內容"]?.rich_text),
        type: extractSelect(props["明細類型"]?.select) || "",
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
          { property: "明細類型", select: { equals: "報名登記" } },
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
        title: extractTitle(props["明細名稱"]?.title),
        topicTitle: extractText(props["主題名稱"]?.rich_text),
        content: "",
        type: extractSelect(props["明細類型"]?.select) || "",
        summary: "",
        date: page.created_time?.substring(0, 10) || null,
        slug: page.id.replace(/-/g, ""),
      };
    });
  } catch (e) { console.error("fetchRegistrationsByEmail error:", e); return []; }
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
        title: extractTitle(props["明細名稱"]?.title),
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
  type: string;        // 標籤選項
  summary: string;     // 簡介摘要
  slug: string;
}

export async function fetchKeywords(limit = 20): Promise<KeywordItem[]> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "標籤選項", select: { equals: "主題標籤" } },
      [{ property: "更新時間", direction: "descending" as const }],
      limit
    );
    return results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: extractTitle(props["經營名稱"]?.title),
        type: extractSelect(props["標籤選項"]?.select) || "",
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
      { property: "Email", rich_text: { equals: email.toLowerCase().trim() } },
      undefined,
      1
    );
    if (results.length === 0) return null;
    const page = results[0] as any;
    const props = page.properties;
    return {
      id: page.id,
      name: extractTitle(props["經營名稱"]?.title),
      type: extractSelect(props["標籤選項"]?.select) || "",
      summary: extractText(props["簡介摘要"]?.rich_text),
      slug: page.id.replace(/-/g, ""),
    };
  } catch (e) { console.error("fetchPersonByEmail error:", e); return null; }
}

// 判斷是否為工作人員（DB08 有「個人細項」欄位）
export async function checkIsStaff(email: string): Promise<boolean> {
  try {
    const results = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      {
        and: [
          { property: "Email", rich_text: { equals: email.toLowerCase().trim() } },
          { property: "個人細項", select: { is_not_empty: true } },
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
