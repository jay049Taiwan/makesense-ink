import { NextRequest, NextResponse } from "next/server";
import { notifyOrderStatusChange } from "@/lib/line-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/line/order-status
 * 訂單狀態變更 → 推播 LINE 通知
 * 由 n8n 或手動呼叫
 */
export async function POST(req: NextRequest) {
  // 驗證 Bearer token
  const auth = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId, newStatus, message } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Missing orderId or newStatus" }, { status: 400 });
    }

    const result = await notifyOrderStatusChange(orderId, newStatus, message);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[order-status] Error:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
