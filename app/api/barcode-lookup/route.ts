import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/barcode-lookup?code=XXX
 * 根據條碼/QR Code 查詢對應商品
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ product: null, error: "missing code" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, notion_id, name, price, images, stock, category, status")
    .eq("barcode", code)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return NextResponse.json({ product: null });
  }

  let photo: string | null = null;
  try { photo = JSON.parse(data.images || "[]")[0] || null; } catch {}

  return NextResponse.json({
    product: {
      id: data.notion_id || data.id,
      name: data.name,
      price: data.price,
      stock: data.stock,
      photo,
      slug: data.notion_id || data.id,
      category: data.category,
    },
  });
}
