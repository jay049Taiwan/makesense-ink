import { createPage, DB } from "./notion";
import { getNotionUserId } from "./notion-users";
import { fetchPersonByEmail } from "./fetch-all";
import { supabaseAdmin } from "./supabase";

// 員工 email → DB08 page id（用於 DB05「對應對象」relation）
export async function getStaffNotionPageId(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const person = await fetchPersonByEmail(email);
  return person?.id ?? null;
}

// 員工 email → staff.id (uuid)（用於 Supabase staff_activities.staff_id）
export async function getStaffIdByEmail(email: string | null | undefined): Promise<string | null> {
  const notionPageId = await getStaffNotionPageId(email);
  if (!notionPageId) return null;
  const { data } = await supabaseAdmin
    .from("staff")
    .select("id")
    .eq("notion_id", notionPageId)
    .maybeSingle();
  return data?.id ?? null;
}

export type StaffRecordType = "attendance" | "expense" | "inventory";

export interface WriteDB05Args {
  type: StaffRecordType;
  /**
   * 子分類 option 值
   * - attendance: 會議 / 打卡 / 請假 / 日誌 / 加班（DB05 紀錄細項 select）
   * - expense:    請購直匯 / 請款轉交
   * - inventory:  進貨 / 出貨 / 盤點
   */
  detail: string;
  title: string;
  staffEmail?: string | null;
  /** DB08 page id（員工本人）；若沒給會用 staffEmail 反查 */
  staffNotionPageId?: string | null;
  amount?: number;
  content?: string;
  /** 覆蓋預設「對應對象＝員工本人」；通常不用設 */
  counterpartId?: string;
  /** inventory cascade：先建好的 DB06 page ids */
  relatedDB06Ids?: string[];
}

export async function writeStaffDB05Record(args: WriteDB05Args): Promise<{ id: string }> {
  const props: Record<string, any> = {
    "內容名稱": { title: [{ text: { content: args.title } }] },
  };

  // 子分類 + 內容類型上游欄位
  if (args.type === "attendance") {
    props["紀錄細項"] = { select: { name: args.detail } };
  } else if (args.type === "expense") {
    props["紀錄費用"] = { select: { name: args.detail } };
  } else if (args.type === "inventory") {
    props["內容類型"] = { select: { name: "報名登記" } };
    props["登記類別"] = { select: { name: "紀錄庫存" } };
    props["庫存細項"] = { select: { name: args.detail } };
  }

  if (typeof args.amount === "number") {
    props["登記單價"] = { number: args.amount };
  }
  if (args.content) {
    props["明細內容"] = { rich_text: [{ text: { content: args.content } }] };
  }

  // 對應對象（→ DB08）— 預設指向員工本人
  const counterpartId = args.counterpartId
    ?? args.staffNotionPageId
    ?? (args.staffEmail ? await getStaffNotionPageId(args.staffEmail) : null);
  if (counterpartId) {
    props["對應對象"] = { relation: [{ id: counterpartId }] };
  }

  // 責任執行（people）— 用 email 反查 Notion workspace user
  if (args.staffEmail) {
    const notionUserId = await getNotionUserId(args.staffEmail);
    if (notionUserId) {
      props["責任執行"] = { people: [{ id: notionUserId }] };
    }
  }

  if (args.relatedDB06Ids && args.relatedDB06Ids.length > 0) {
    props["對應明細"] = { relation: args.relatedDB06Ids.map((id) => ({ id })) };
  }

  const page = await createPage(DB.DB05_REGISTRATION, props);
  return { id: page.id };
}
