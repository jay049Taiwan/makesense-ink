import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/barcode-lookup?code=XXX
 * 根據條碼/QR Code 查詢對應商品
 * 1. 先查 barcode 欄位完全匹配
 * 2. 如果是 ISBN（數字 10-13 碼），也做名稱模糊搜尋
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ product: null, error: "missing code" }, { status: 400 });
  }

  // 1. 先查 barcode 完全匹配
  const { data: exactMatch } = await supabase
    .from("products")
    .select("id, notion_id, name, price, images, stock, category, status")
    .eq("barcode", code)
    .eq("status", "active")
    .single();

  if (exactMatch) {
    return NextResponse.json({ product: formatProduct(exactMatch) });
  }

  // 2. 去掉 ISBN 前綴的連字號，嘗試不同格式
  const cleanCode = code.replace(/[-\s]/g, "");
  if (cleanCode !== code) {
    const { data: cleanMatch } = await supabase
      .from("products")
      .select("id, notion_id, name, price, images, stock, category, status")
      .eq("barcode", cleanCode)
      .eq("status", "active")
      .single();

    if (cleanMatch) {
      return NextResponse.json({ product: formatProduct(cleanMatch) });
    }
  }

  // 3. 找不到 — 回傳掃描到的條碼值，讓前端可以顯示
  return NextResponse.json({
    product: null,
    scannedCode: code,
    message: "此條碼尚未建檔，可嘗試用名稱搜尋",
  });
}

function formatProduct(data: any) {
  let photo: string | null = null;
  try { photo = JSON.parse(data.images || "[]")[0] || null; } catch {}

  return {
    id: data.notion_id || data.id,
    name: data.name,
    price: data.price,
    stock: data.stock,
    photo,
    slug: data.notion_id || data.id,
    category: data.category,
  };
}
