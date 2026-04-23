import { NextRequest, NextResponse } from "next/server";
import { createPage, getPage, updatePage, DB } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";
import { lineClient } from "@/lib/line";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function t(prop: any): string { return prop?.title?.[0]?.plain_text || prop?.title?.map((x: any) => x.plain_text).join("") || ""; }
function tx(prop: any): string { return prop?.rich_text?.map((x: any) => x.plain_text).join("") || ""; }
function rel(prop: any): string[] { return (prop?.relation || []).map((r: any) => r.id); }

function toDashed(id: string): string {
  const c = id.replace(/-/g, "");
  if (c.length !== 32) return id;
  return `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20)}`;
}

/**
 * POST /api/buy/preorder
 * Body: {
 *   vendorDb05Id: string,
 *   contact: { name, phone, email, note? },
 *   items: Array<{ id: string, type: "商品"|"體驗"|"活動", name: string, price: number, qty: number }>
 * }
 *
 * 建 Notion DB05 新訂單（對應對象=攤商的 DB05 id，對應協作=市集 DB04），
 * 每個 item 建一筆 DB06（明細名稱「預購-...」），LINE 推給攤商 + 買家
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorDb05Id, contact, items } = body;

    if (!vendorDb05Id || !contact?.name || !contact?.phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    // 讀攤商 DB05 → 取 對應協作（市集）與攤商 email 作為 LINE 查詢 key
    const vendorPage: any = await getPage(vendorDb05Id.replace(/-/g, ""));
    const vp = vendorPage?.properties || {};
    const vendorBrand = (tx(vp["明細內容"]).match(/品牌名稱[:：]\s*(.+)/)?.[1] || "").trim();
    const vendorEmail = (tx(vp["登記信箱"]) || "").trim().toLowerCase();
    const marketRels = rel(vp["對應協作"]);
    const marketDashed = marketRels[0] || null;
    let marketTitle = "市集";
    if (marketDashed) {
      try {
        const mp: any = await getPage(marketDashed);
        marketTitle = t(mp?.properties?.["主題名稱"]) || t(mp?.properties?.["交接名稱"]) || "市集";
      } catch {}
    }

    const orderNumber = `PO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const total = items.reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

    // 建 DB06 明細
    const db06Ids: string[] = [];
    for (const it of items) {
      if (!it.name || !it.qty) continue;
      const prefix = it.type === "體驗" ? "預購體驗-" : it.type === "活動" ? "預購活動-" : "預購-";
      try {
        const page: any = await createPage(DB.DB06_TRANSACTION, {
          "明細名稱": { title: [{ text: { content: `${prefix}${it.name}` } }] },
          "明細類型": { select: { name: "報名登記" } },
          "登記選項": { select: { name: "預約報名" } },
          "登記單價": { number: Number(it.price) || 0 },
          "登記數量": { number: Number(it.qty) || 0 },
        });
        if (page?.id) db06Ids.push(page.id);
      } catch (e: any) {
        console.warn("DB06 預購明細建立失敗:", e.message);
      }
    }

    // 建 DB05 預購訂單標頭
    const db05Props: Record<string, any> = {
      "表單名稱": { title: [{ text: { content: `預購 ${orderNumber} · ${vendorBrand}` } }] },
      "表單類型": { select: { name: "報名登記" } },
      "登記選項": { select: { name: "預約報名" } },
      "登記聯絡人": { rich_text: [{ text: { content: contact.name } }] },
      "登記電話": { rich_text: [{ text: { content: contact.phone } }] },
    };
    if (contact.email) db05Props["登記信箱"] = { rich_text: [{ text: { content: contact.email } }] };
    if (contact.note) db05Props["登記備註"] = { rich_text: [{ text: { content: contact.note } }] };
    if (marketDashed) db05Props["對應協作"] = { relation: [{ id: marketDashed }] };
    // 對應對象用來關聯攤商 DB05（讓主辦/攤商可從 Notion 查）
    db05Props["對應表單"] = { relation: [{ id: toDashed(vendorDb05Id) }] };
    if (db06Ids.length > 0) {
      db05Props["對應明細"] = { relation: db06Ids.map((id) => ({ id })) };
    }

    let preorderDb05Id: string | null = null;
    try {
      const page: any = await createPage(DB.DB05_REGISTRATION, db05Props);
      preorderDb05Id = page?.id || null;
    } catch (e: any) {
      console.error("預購 DB05 建立失敗:", e.message);
      return NextResponse.json({ error: "預購建立失敗" }, { status: 500 });
    }

    // Supabase 也存一筆 order（source='preorder'）方便統計
    try {
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("email", (contact.email || "").toLowerCase())
        .maybeSingle();

      await supabaseAdmin.from("orders").insert({
        member_id: member?.id || null,
        status: "confirmed",
        total,
        source: "preorder",
        notion_db05_id: String(preorderDb05Id).replace(/-/g, ""),
      });
    } catch (e: any) {
      console.warn("Supabase order 寫入失敗:", e.message);
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

    // LINE 推給買家（若已綁定）
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
      preorderDb05Id: String(preorderDb05Id).replace(/-/g, ""),
    });
  } catch (e: any) {
    console.error("[api/buy/preorder] error:", e.message);
    return NextResponse.json({ error: e.message || "預購失敗" }, { status: 500 });
  }
}
