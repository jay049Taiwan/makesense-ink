import { supabaseAdmin as supabase } from "@/lib/supabase";
import { getPage, createPage, DB, extractTitle, extractRelation, extractNumber } from "@/lib/notion";
import { notifyRegistrationResult } from "@/lib/line-notifications";

export type AdmissionResult = "accepted" | "rejected";

export interface AdmissionNotifyOptions {
  db05PageId: string;
  result: AdmissionResult;
  eventName?: string;
  customMessage?: string;
  lineUid?: string;
  memberEmail?: string;
  skipLine?: boolean;
  /** 預先取得的 DB05 頁面資料（避免重複 fetch） */
  db05Page?: any;
  /** 預先解析好的 memberId（避免重複查 Supabase） */
  memberId?: string | null;
}

export interface AdmissionNotifyResult {
  memberId: string | null;
  eventName: string;
  linePushed: boolean;
  offsetCount: number;
  offsetResults: Array<{ sourcePageId: string; offsetPageId?: string; error?: string }>;
}

/**
 * 錄取/未錄取通知的共用邏輯：
 * 1. 推 LINE（錄取→Flex 卡片；未錄取→純文字）
 * 2. 未錄取時 → 為每個關聯的 DB06 建立「調撥對衝」進貨明細
 *
 * 被 /api/line/registration-result 和 /api/sync/single 共用。
 */
export async function processAdmission(opts: AdmissionNotifyOptions): Promise<AdmissionNotifyResult> {
  const { db05PageId, result, customMessage, skipLine } = opts;

  // 1. 取 DB05 頁（允許外部先抓好傳進來）
  const db05: any = opts.db05Page || (await getPage(db05PageId));
  const db05Title = extractTitle(db05.properties?.["表單名稱"]?.title) || "報名";
  const eventName = opts.eventName || db05Title;
  const db06Relations = extractRelation(db05.properties?.["對應明細"]?.relation);

  // 2. 解析 memberId（若外部未給）
  let memberId: string | null = opts.memberId ?? null;
  if (!memberId && opts.lineUid) {
    const { data } = await supabase
      .from("members")
      .select("id")
      .eq("line_uid", opts.lineUid)
      .maybeSingle();
    memberId = data?.id || null;
  }
  if (!memberId && opts.memberEmail) {
    const normalized = opts.memberEmail.toLowerCase().trim();
    const { data } = await supabase
      .from("members")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    memberId = data?.id || null;
  }
  if (!memberId) {
    const m = db05Title.match(/官網訂單\s+([0-9a-f]{8})/i);
    if (m) {
      const prefix = m[1].toLowerCase();
      const { data: order } = await supabase
        .from("orders")
        .select("member_id")
        .like("id", `${prefix}%`)
        .maybeSingle();
      if (order?.member_id) memberId = order.member_id;
    }
  }

  // 3. 未錄取 → 為每個 DB06 建對衝進貨明細
  const offsetResults: AdmissionNotifyResult["offsetResults"] = [];
  if (result === "rejected" && db06Relations.length > 0) {
    for (const db06PageId of db06Relations) {
      try {
        const src: any = await getPage(db06PageId);
        const srcProps = src.properties || {};
        const srcName = extractTitle(srcProps["明細名稱"]?.title) || "對衝";
        const srcQty = extractNumber(srcProps["登記數量"]?.number) ?? 0;
        const srcPrice = extractNumber(srcProps["登記單價"]?.number) ?? 0;
        const srcInventoryRel = extractRelation(srcProps["對應庫存"]?.relation);

        const offsetProps: Record<string, any> = {
          "明細名稱": { title: [{ text: { content: `[對衝-未錄取] ${srcName}` } }] },
          "明細類型": { select: { name: "庫存紀錄" } },
          "庫存選項": { select: { name: "進貨" } },
          "庫存備項": { select: { name: "調撥對衝" } },
          "登記數量": { number: srcQty },
          "登記單價": { number: srcPrice },
        };
        if (srcInventoryRel.length > 0) {
          offsetProps["對應庫存"] = { relation: srcInventoryRel.map((id) => ({ id })) };
        }
        offsetProps["對應表單"] = { relation: [{ id: db05PageId }] };

        const offsetPage: any = await createPage(DB.DB06_TRANSACTION, offsetProps);
        offsetResults.push({ sourcePageId: db06PageId, offsetPageId: offsetPage.id });
      } catch (e: any) {
        console.error(`[admission-notify] 對衝失敗 ${db06PageId}:`, e.message);
        offsetResults.push({ sourcePageId: db06PageId, error: e.message });
      }
    }
  }

  // 4. LINE 推播
  let linePushed = false;
  if (!skipLine && memberId) {
    try {
      await notifyRegistrationResult(memberId, eventName, result, customMessage);
      linePushed = true;
    } catch (e: any) {
      console.error("[admission-notify] LINE 推播失敗:", e.message);
    }
  }

  return {
    memberId,
    eventName,
    linePushed,
    offsetCount: offsetResults.filter((r) => r.offsetPageId).length,
    offsetResults,
  };
}
