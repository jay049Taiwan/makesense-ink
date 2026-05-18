import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, isLinePayConfigured } from "@/lib/line-pay";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/line-pay/confirm?transactionId=xxx&orderId=xxx
 * LINE Pay 付款完成後的 callback
 */
export async function GET(req: NextRequest) {
  if (!isLinePayConfigured()) {
    return NextResponse.redirect(new URL("/checkout?error=linepay_not_configured", req.url));
  }

  const transactionId = req.nextUrl.searchParams.get("transactionId");
  const orderId = req.nextUrl.searchParams.get("orderId");

  if (!transactionId || !orderId) {
    return NextResponse.redirect(new URL("/checkout?error=missing_params", req.url));
  }

  try {
    // 查訂單金額
    const { data: order } = await supabase
      .from("orders")
      .select("id, total, status, payment_transaction_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.redirect(new URL("/checkout?error=order_not_found", req.url));
    }

    // 驗證 transactionId 與訂單的綁定關係（防止用別人的 transactionId 確認不屬於他的訂單）
    if (order.payment_transaction_id && order.payment_transaction_id !== transactionId) {
      console.warn(`[line-pay/confirm] transactionId mismatch — orderId=${orderId} stored=${order.payment_transaction_id} got=${transactionId}`);
      return NextResponse.redirect(new URL("/checkout?error=invalid_transaction", req.url));
    }

    // 確認付款
    const result = await confirmPayment(transactionId, order.total);

    if (result.returnCode === "0000") {
      // 更新訂單狀態
      await supabase
        .from("orders")
        .update({
          status: "confirmed",
          payment_method: "line_pay",
          payment_transaction_id: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.redirect(
        new URL(`/checkout/success?status=success&orderId=${orderId}`, req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/checkout?error=payment_failed&message=${encodeURIComponent(result.returnMessage)}`, req.url)
      );
    }
  } catch (err: any) {
    console.error("[line-pay/confirm] Error:", err.message);
    return NextResponse.redirect(new URL("/checkout?error=payment_error", req.url));
  }
}
