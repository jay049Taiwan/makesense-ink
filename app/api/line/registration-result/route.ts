import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { getPage, createPage, DB, extractTitle, extractRelation, extractNumber, extractSelect } from "@/lib/notion";
import { notifyRegistrationResult } from "@/lib/line-notifications";

/**
 * POST /api/line/registration-result
 *
 * 由 n8n webhook 呼叫：當 DB05「錄取狀態」改為「錄取」或「未錄取」時觸發
 *
 * 功能：
 *   1. 推播 LINE 錄取/未錄取通知給對應會員
 *   2. 若未錄取 → 自動在 DB06 建立「進貨對衝」明細（庫存備項=調撥對衝），
 *      讓庫存總計回補、避免營收多算
 *
 * Request body:
 *   - db05PageId  (required): 觸發變動的 DB05 頁 ID
 *   - result      (required): "accepted" | "rejected"
 *   - eventName   (optional): 顯示用活動名稱（預設讀 DB05 表單名稱）
 *   - customMessage (optional): 覆寫預設文案
 *   - lineUid     (optional): n8n 若已查好，可直接傳
 *   - memberEmail (optional): fallback 解析 member
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      db05PageId,
      result,
      eventName: inputEventName,
      customMessage,
      lineUid: inputLineUid,
      memberEmail,
    } = body as {
      db05PageId: string;
      result: "accepted" | "rejected";
      eventName?: string;
      customMessage?: string;
      lineUid?: string;
      memberEmail?: string;
    };

    if (!db05PageId || !result) {
      return NextResponse.json({ error: "db05PageId 與 result 為必填" }, { status: 400 });
    }
    if (result !== "accepted" && result !== "rejected") {
      return NextResponse.json({ error: "result 只能是 accepted 或 rejected" }, { status: 400 });
    }

    // 1. 讀 DB05 頁
    const db05: any = await getPage(db05PageId);
    const db05Title = extractTitle(db05.properties?.["表單名稱"]?.title) || "報名";
    const eventName = inputEventName || db05Title;
    const db06Relations = extractRelation(db05.properties?.["對應明細"]?.relation);

    // 2. 解析 member → memberId（為了 notifyRegistrationResult 用）
    let memberId: string | null = null;
    if (inputLineUid) {
      const { data } = await supabase
        .from("members")
        .select("id")
        .eq("line_uid", inputLineUid)
        .maybeSingle();
      memberId = data?.id || null;
    }
    if (!memberId && memberEmail) {
      const normalized = memberEmail.toLowerCase().trim();
      const { data } = await supabase
        .from("members")
        .select("id")
        .eq("email", normalized)
        .maybeSingle();
      memberId = data?.id || null;
    }
    // fallback：從 DB05 title 解析「官網訂單 xxxxxxxx」prefix 對 orders.id
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

    // 3. 若未錄取 → 為每個 DB06 建對衝進貨明細
    const offsetResults: Array<{ sourcePageId: string; offsetPageId?: string; error?: string }> = [];
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
          // 把對衝明細也掛回原 DB05（方便稽核追蹤）
          offsetProps["對應表單"] = { relation: [{ id: db05PageId }] };

          const offsetPage: any = await createPage(DB.DB06_TRANSACTION, offsetProps);
          offsetResults.push({ sourcePageId: db06PageId, offsetPageId: offsetPage.id });
        } catch (e: any) {
          console.error(`[registration-result] 對衝失敗 ${db06PageId}:`, e.message);
          offsetResults.push({ sourcePageId: db06PageId, error: e.message });
        }
      }
    }

    // 4. LINE 推播
    let linePushed = false;
    if (memberId) {
      try {
        await notifyRegistrationResult(memberId, eventName, result, customMessage);
        linePushed = true;
      } catch (e: any) {
        console.error("[registration-result] LINE 推播失敗:", e.message);
      }
    } else {
      console.warn("[registration-result] 找不到對應 member，略過 LINE 推播", { db05PageId });
    }

    return NextResponse.json({
      success: true,
      db05PageId,
      result,
      eventName,
      memberId,
      linePushed,
      offsetCount: offsetResults.filter((r) => r.offsetPageId).length,
      offsetResults,
    });
  } catch (err: any) {
    console.error("[registration-result] 錯誤:", err);
    return NextResponse.json({ error: err.message || "系統錯誤" }, { status: 500 });
  }
}
