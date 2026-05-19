import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, isLinePayConfigured } from "@/lib/line-pay";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/line-pay/confirm?transactionId=xxx&orderId=xxx
 * LINE Pay 付款完成後的 callback
 *
 * Security:
 * - 冪等性：訂單已 confirmed 直接導向成功頁，不重複呼叫 LINE Pay
 * - payment_transaction_id 必須存在且吻合（防止跨訂單攻擊）
 * - 使用 DB 金額做 confirm，與 reserve 一致
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
    // 查訂單
    const { data: order } = await supabase
      .from("orders")
      .select("id, total, status, payment_transaction_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.redirect(new URL("/checkout?error=order_not_found", req.url));
    }

    // 冪等性：訂單已付款完成，直接導向成功頁（防止重複打 LINE Pay）
    if (order.status === "confirmed") {
      return NextResponse.redirect(
        new URL(`/checkout/success?status=success&orderId=${orderId}`, req.url)
      );
    }

    // 訂單必須有已綁定的 transactionId（透過 reserve 流程產生）
    // 若為 null，代表訂單從未走過 LINE Pay reserve，拒絕此 confirm
    if (!order.payment_transaction_id) {
      console.warn(`[line-pay/confirm] orderId=${orderId} 無 transactionId，疑似未走過 reserve 流程`);
      return NextResponse.redirect(new URL("/checkout?error=invalid_transaction", req.url));
    }

    // 驗證 transactionId 與訂單的綁定關係（防止跨訂單攻擊）
    if (order.payment_transaction_id !== transactionId) {
      console.warn(`[line-pay/confirm] transactionId 不符 — orderId=${orderId} stored=${order.payment_transaction_id} got=${transactionId}`);
      return NextResponse.redirect(new URL("/checkout?error=invalid_transaction", req.url));
    }

    // 確認付款（使用 DB 金額，與 reserve 一致）
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
