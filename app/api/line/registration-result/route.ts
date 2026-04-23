import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { getPage } from "@/lib/notion";
import { processAdmission } from "@/lib/admission-notify";

/**
 * POST /api/line/registration-result
 *
 * 由 n8n webhook 呼叫（備援路徑；主要觸發走 /api/sync/single 的 DB05 預約報名分支）。
 * V2：未錄取不做對衝（V2 架構報名時就沒扣庫存），只標記退款狀態 + LINE。
 *
 * Request body:
 *   - db05PageId  (required): 觸發變動的 DB05 頁 ID（dashed 或無 dash 都可）
 *   - result      (required): "accepted" | "rejected"
 *   - eventName   (optional): 顯示用活動名稱（預設讀 DB05 表單名稱）
 *   - customMessage (optional): 覆寫預設文案
 *   - skipLine    (optional): true 時不推 LINE（給 n8n 工作流用，避免重複）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { db05PageId, result, eventName, customMessage, skipLine } = body as {
      db05PageId: string;
      result: "accepted" | "rejected";
      eventName?: string;
      customMessage?: string;
      skipLine?: boolean;
    };

    if (!db05PageId || !result) {
      return NextResponse.json({ error: "db05PageId 與 result 為必填" }, { status: 400 });
    }
    if (result !== "accepted" && result !== "rejected") {
      return NextResponse.json({ error: "result 只能是 accepted 或 rejected" }, { status: 400 });
    }

    const cleanNid = db05PageId.replace(/-/g, "");
    const dashedId = cleanNid.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");

    // 查 order
    const { data: order } = await supabase
      .from("orders")
      .select("id, member_id, admission_notified_status, confirmed_db05_notion_id")
      .eq("notion_db05_id", cleanNid)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: `找不到對應訂單（notion_db05_id=${cleanNid}）` }, { status: 404 });
    }

    // 抓 DB05 頁（用來複製欄位到 confirmed DB05）
    const db05Page = await getPage(dashedId);

    const outcome = await processAdmission({
      db05PageId: dashedId,
      result,
      orderId: order.id,
      memberId: order.member_id,
      db05Page,
      existingConfirmedDb05: order.confirmed_db05_notion_id,
      eventName,
      customMessage,
      skipLine,
    });

    // 同步更新 orders 狀態（跟 sync/single 的 reservation 分支一致）
    const orderUpdates: Record<string, any> = {
      admission_notified_status: result === "accepted" ? "錄取" : "未錄取",
      status: result === "accepted" ? "confirmed" : "cancelled",
    };
    if (outcome.confirmedDb05NotionId && !order.confirmed_db05_notion_id) {
      orderUpdates.confirmed_db05_notion_id = outcome.confirmedDb05NotionId;
    }
    if (outcome.refundStatus) {
      orderUpdates.refund_status = outcome.refundStatus;
    }
    await supabase.from("orders").update(orderUpdates).eq("id", order.id);

    return NextResponse.json({
      success: true,
      db05PageId: cleanNid,
      orderId: order.id,
      result,
      ...outcome,
    });
  } catch (err: any) {
    console.error("[registration-result] 錯誤:", err);
    return NextResponse.json({ error: err.message || "系統錯誤" }, { status: 500 });
  }
}
