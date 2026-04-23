import { NextRequest, NextResponse } from "next/server";
import { getPage } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";
import { lineClient } from "@/lib/line";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function t(prop: any): string { return prop?.title?.[0]?.plain_text || prop?.title?.map((x: any) => x.plain_text).join("") || ""; }
function tx(prop: any): string { return prop?.rich_text?.map((x: any) => x.plain_text).join("") || ""; }
function rel(prop: any): string[] { return (prop?.relation || []).map((r: any) => r.id); }

/**
 * POST /api/buy/preorder
 *
 * 民眾在 /buy/vendor-xxx 頁面預購攤商商品/體驗/活動。
 *
 * 設計決策：
 * - **不寫 Notion DB05/DB06**（這不是 Noah 公司的營收，是攤商的生意）
 * - 只寫 Supabase 的 vendor_preorders + vendor_preorder_items（統計用）
 * - LINE 推給攤商（每筆一則訊息，攤商自己整理）
 * - LINE 推給買家（確認訊息）
 *
 * Body: {
 *   vendorDb05Id: string,
 *   contact: { name, phone, email?, note? },
 *   items: Array<{ id: string, type: "商品"|"體驗"|"活動", name: string, price: number, qty: number }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorDb05Id, contact, items } = body;

    if (!vendorDb05Id || !contact?.name || !contact?.phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    // 從 Notion 取攤商 + 市集資訊（僅讀，不寫）
    const vendorPage: any = await getPage(vendorDb05Id.replace(/-/g, ""));
    const vp = vendorPage?.properties || {};
    const vendorBrand = (tx(vp["明細內容"]).match(/品牌名稱[:：]\s*(.+)/)?.[1] || t(vp["表單名稱"])).trim();
    const vendorEmail = (tx(vp["登記信箱"]) || "").trim().toLowerCase();
    const marketRels = rel(vp["對應協作"]);
    const marketId = marketRels[0] ? marketRels[0].replace(/-/g, "") : null;
    let marketTitle = "市集";
    if (marketRels[0]) {
      try {
        const mp: any = await getPage(marketRels[0]);
        marketTitle = t(mp?.properties?.["主題名稱"]) || t(mp?.properties?.["交接名稱"]) || "市集";
      } catch {}
    }

    const orderNumber = `PO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const total = items.reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

    // 寫 Supabase vendor_preorders + items
    const { data: preorder, error: preErr } = await supabaseAdmin
      .from("vendor_preorders")
      .insert({
        order_number: orderNumber,
        vendor_db05_notion_id: vendorDb05Id.replace(/-/g, ""),
        vendor_brand: vendorBrand,
        market_db04_notion_id: marketId,
        market_title: marketTitle,
        buyer_name: contact.name,
        buyer_phone: contact.phone,
        buyer_email: (contact.email || "").toLowerCase() || null,
        buyer_note: contact.note || null,
        total,
      })
      .select("id")
      .single();

    if (preErr || !preorder) {
      console.error("[vendor_preorders insert]", preErr);
      return NextResponse.json({ error: `預購建立失敗：${preErr?.message || "unknown"}` }, { status: 500 });
    }

    const itemRows = items
      .filter((it: any) => it.name && it.qty)
      .map((it: any) => ({
        preorder_id: preorder.id,
        item_type: it.type || "商品",
        item_name: it.name,
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 0,
      }));
    if (itemRows.length > 0) {
      await supabaseAdmin.from("vendor_preorder_items").insert(itemRows);
    }

    // LINE 推給攤商
    try {
      if (vendorEmail) {
        const { data: vendorMember } = await supabaseAdmin
          .from("members")
          .select("line_uid")
          .eq("email", vendorEmail)
          .maybeSingle();
        if (vendorMember?.line_uid) {
          const itemLines = items.slice(0, 5).map((it: any) => `・${it.name} ×${it.qty}`).join("\n");
          const more = items.length > 5 ? `\n…等共 ${items.length} 項` : "";
          await lineClient.pushMessage({
            to: vendorMember.line_uid,
            messages: [{
              type: "text" as const,
              text: `🎁 有新預購單！\n\n買家：${contact.name}\n電話：${contact.phone}\n訂單：${orderNumber}\n\n${itemLines}${more}\n\n合計：NT$ ${total.toLocaleString()}\n（市集當天現場交付）`,
            }],
          });
        }
      }
    } catch (e: any) {
      console.warn("LINE 推給攤商失敗:", e.message);
    }

    // LINE 推給買家
    try {
      if (contact.email) {
        const { data: buyerMember } = await supabaseAdmin
          .from("members")
          .select("line_uid")
          .eq("email", contact.email.toLowerCase())
          .maybeSingle();
        if (buyerMember?.line_uid) {
          const itemLines = items.slice(0, 5).map((it: any) => `・${it.name} ×${it.qty}`).join("\n");
          await lineClient.pushMessage({
            to: buyerMember.line_uid,
            messages: [{
              type: "text" as const,
              text: `✅ 預購已送出\n\n訂單：${orderNumber}\n攤商：${vendorBrand}\n市集：${marketTitle}\n\n${itemLines}\n\n合計：NT$ ${total.toLocaleString()}\n（請於市集當天至攤位取貨付款）`,
            }],
          });
        }
      }
    } catch (e: any) {
      console.warn("LINE 推給買家失敗:", e.message);
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      preorderId: preorder.id,
    });
  } catch (e: any) {
    console.error("[api/buy/preorder] error:", e.message);
    return NextResponse.json({ error: e.message || "預購失敗" }, { status: 500 });
  }
}
