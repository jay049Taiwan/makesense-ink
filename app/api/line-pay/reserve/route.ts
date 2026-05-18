import { NextRequest, NextResponse } from "next/server";
import { reservePayment, isLinePayConfigured } from "@/lib/line-pay";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/line-pay/reserve
 * 建立 LINE Pay 付款請求
 */
export async function POST(req: NextRequest) {
  if (!isLinePayConfigured()) {
    return NextResponse.json({
      error: "LINE Pay 尚未開通",
      message: "目前僅支援到門市現場付現，LINE Pay 即將開放",
    }, { status: 503 });
  }

  try {
    const { orderId, amount, productName } = await req.json();

    if (!orderId || !amount) {
      return NextResponse.json({ error: "Missing orderId or amount" }, { status: 400 });
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
