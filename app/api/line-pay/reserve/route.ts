import { NextRequest, NextResponse } from "next/server";
import { reservePayment, isLinePayConfigured } from "@/lib/line-pay";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/line-pay/reserve
 * 建立 LINE Pay 付款請求
 *
 * Security:
 * - amount 從 DB 讀取（不接受 client 傳入），防止用戶竄改付款金額
 * - 已 confirmed 的訂單不允許再次發起付款
 */
export async function POST(req: NextRequest) {
  if (!isLinePayConfigured()) {
    return NextResponse.json({
      error: "LINE Pay 尚未開通",
      message: "目前僅支援到門市現場付現，LINE Pay 即將開放",
    }, { status: 503 });
  }

  try {
    // 只接受 orderId 和 productName，amount 不從 client 取
    const { orderId, productName } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // 從 DB 取得真實訂單金額（防止 client 竄改 amount）
    const { data: order } = await supabase
      .from("orders")
      .select("id, total, status")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    // 已付款完成的訂單不允許再次發起付款（防止重複扣款）
    if (order.status === "confirmed") {
      return NextResponse.json({ error: "此訂單已付款完成" }, { status: 409 });
    }

    // 使用 DB 真實金額
    const amount = Number(order.total);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "訂單金額無效" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const result = await reservePayment({
      orderId,
      amount,
      productName: productName || "旅人書店訂單",
      confirmUrl: `${origin}/api/line-pay/confirm?orderId=${orderId}`,
      cancelUrl: `${origin}/checkout?cancelled=true`,
    });

    if (result.returnCode === "0000") {
      // 把 transactionId 存到 orders，confirm 時用來驗證綁定（防 IDOR）
      await supabase
        .from("orders")
        .update({ payment_transaction_id: String(result.info.transactionId) })
        .eq("id", orderId);

      return NextResponse.json({
        paymentUrl: result.info.paymentUrl.web,
        appPaymentUrl: result.info.paymentUrl.app,
        transactionId: result.info.transactionId,
      });
    } else {
      return NextResponse.json({ error: result.returnMessage }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[line-pay/reserve] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
