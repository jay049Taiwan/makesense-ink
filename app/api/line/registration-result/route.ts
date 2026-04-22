import { NextRequest, NextResponse } from "next/server";
import { processAdmission } from "@/lib/admission-notify";

/**
 * POST /api/line/registration-result
 *
 * 由 n8n webhook 呼叫：當 DB05「錄取狀態」改為「錄取」或「未錄取」時觸發
 *
 * Request body:
 *   - db05PageId  (required): 觸發變動的 DB05 頁 ID
 *   - result      (required): "accepted" | "rejected"
 *   - eventName   (optional): 顯示用活動名稱（預設讀 DB05 表單名稱）
 *   - customMessage (optional): 覆寫預設文案
 *   - lineUid     (optional): n8n 若已查好，可直接傳
 *   - memberEmail (optional): fallback 解析 member
 *   - skipLine    (optional): true 時只做 DB06 對衝，不推 LINE
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      db05PageId,
      result,
      eventName,
      customMessage,
      lineUid,
      memberEmail,
      skipLine,
    } = body as {
      db05PageId: string;
      result: "accepted" | "rejected";
      eventName?: string;
      customMessage?: string;
      lineUid?: string;
      memberEmail?: string;
      skipLine?: boolean;
    };

    if (!db05PageId || !result) {
      return NextResponse.json({ error: "db05PageId 與 result 為必填" }, { status: 400 });
    }
    if (result !== "accepted" && result !== "rejected") {
      return NextResponse.json({ error: "result 只能是 accepted 或 rejected" }, { status: 400 });
    }

    const outcome = await processAdmission({
      db05PageId,
      result,
      eventName,
      customMessage,
      lineUid,
      memberEmail,
      skipLine,
    });

    return NextResponse.json({
      success: true,
      db05PageId,
      result,
      ...outcome,
    });
  } catch (err: any) {
    console.error("[registration-result] 錯誤:", err);
    return NextResponse.json({ error: err.message || "系統錯誤" }, { status: 500 });
  }
}
