import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // orderId 是 UUID v4，猜不到；允許訪客以 UUID 查自己剛結帳的訂單
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, status, total, created_at, source,
      members (id, email),
      order_items (id, item_type, quantity, price, meta)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: "找不到訂單" }, { status: 404 });

  // 若已登入，驗證訂單屬於此人；未登入則憑 UUID 放行
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  const orderEmail = (order as any).members?.email || "";
  if (email && orderEmail && orderEmail !== email) {
    return NextResponse.json({ error: "無權查看此訂單" }, { status: 403 });
  }

  return NextResponse.json({ order });
}
