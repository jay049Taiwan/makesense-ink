export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createPage, DB } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

function toDashedNotionId(id: string | null | undefined): string | null {
  if (!id) return null;
  const clean = id.replace(/-/g, "");
  if (clean.length !== 32) return null;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

/**
 * 市集攤商報名 API
 *
 * Body (JSON):
 * {
 *   eventNotionId: string,    // DB04 活動 notion_id
 *   contact: { name, phone, email },
 *   brand: { type, region, name, url, keywords, intro, motivation?, logoUrl?, imageUrl? },
 *   products: [{ name, price, intro, preorder_limit, photoUrl? }],
 *   experiences: [{ name, price, desc, duration, capacity }],
 *   equipment: { tableCount, chairCount, needsPower }
 * }
 *
 * 會建：
 * - DB05 主報名紀錄（表單類型=報名登記、登記選項=預約報名）
 * - DB06 每個商品一筆（明細名稱「商品-xxx」）、每個體驗一筆（「體驗-xxx」）
 * - DB06 設備三筆（「設備-桌」、「設備-椅」、「設備-電源」）
 * - 全部以「對應表單」relation 連回 DB05
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventNotionId, contact, brand, products = [], experiences = [], equipment = {} } = body;

    // 基本驗證
    if (!contact?.name || !contact?.phone || !contact?.email) {
      return NextResponse.json({ error: "缺少聯絡人資料" }, { status: 400 });
    }
    if (!brand?.name || !brand?.intro) {
      return NextResponse.json({ error: "缺少品牌名稱或簡介" }, { status: 400 });
    }

    // 主報名紀錄（DB05）— 先建好拿 id
    const brandSummaryLines = [
      `品牌名稱：${brand.name}`,
      brand.type ? `攤位類型：${brand.type}` : null,
      brand.region ? `所在地區：${brand.region}` : null,
      brand.url ? `粉專/官網：${brand.url}` : null,
      brand.keywords ? `品牌關鍵字：${brand.keywords}` : null,
      `品牌簡介：${brand.intro}`,
      brand.motivation ? `問題回饋：${brand.motivation}` : null,
      brand.logoUrl ? `Logo：${brand.logoUrl}` : null,
      brand.imageUrl ? `情境照：${brand.imageUrl}` : null,
    ].filter(Boolean).join("\n");

    const db05Props: Record<string, any> = {
      "表單名稱": { title: [{ text: { content: `市集報名：${brand.name}` } }] },
      "表單類型": { select: { name: "報名登記" } },
      "登記選項": { select: { name: "預約報名" } },
      "明細內容": { rich_text: [{ text: { content: brandSummaryLines.slice(0, 1900) } }] },
      "登記聯絡人": { rich_text: [{ text: { content: contact.name } }] },
      "登記電話": { rich_text: [{ text: { content: contact.phone } }] },
      "登記信箱": { rich_text: [{ text: { content: contact.email } }] },
    };

    // 關聯活動（DB04）
    if (eventNotionId) {
      const dashed = toDashedNotionId(eventNotionId);
      if (dashed) db05Props["對應協作"] = { relation: [{ id: dashed }] };
    }

    // Logo / 情境照用「上傳檔案」（external URL）
    const files: any[] = [];
    if (brand.logoUrl) files.push({ name: "品牌 Logo", type: "external", external: { url: brand.logoUrl } });
    if (brand.imageUrl) files.push({ name: "品牌情境照", type: "external", external: { url: brand.imageUrl } });
    if (files.length > 0) db05Props["上傳檔案"] = { files };

    const db05Page: any = await createPage(DB.DB05_REGISTRATION, db05Props);
    const db05Id = db05Page?.id as string;
    if (!db05Id) throw new Error("DB05 建立失敗");
    const db05Dashed = toDashedNotionId(db05Id);

    // DB06 批次建立
    const db06Ids: string[] = [];

    const makeDb06 = async (
      title: string,
      price: number | null,
      qty: number | null,
      details: string,
      photoUrl?: string | null
    ) => {
      const props: Record<string, any> = {
        "明細名稱": { title: [{ text: { content: title } }] },
        "明細類型": { select: { name: "報名登記" } },
        "登記選項": { select: { name: "預約報名" } },
      };
      if (price !== null && !isNaN(price)) props["登記單價"] = { number: price };
      if (qty !== null && !isNaN(qty)) props["登記數量"] = { number: qty };
      if (details) props["明細內容"] = { rich_text: [{ text: { content: details.slice(0, 1900) } }] };
      if (db05Dashed) props["對應表單"] = { relation: [{ id: db05Dashed }] };
      if (photoUrl) {
        props["上傳檔案"] = { files: [{ name: title, type: "external", external: { url: photoUrl } }] };
      }
      try {
        const page: any = await createPage(DB.DB06_TRANSACTION, props);
        if (page?.id) db06Ids.push(page.id);
      } catch (e: any) {
        console.warn(`DB06 失敗 (${title}):`, e.message);
      }
    };

    // 商品
    for (const p of products) {
      if (!p?.name) continue;
      const limit = p.preorder_limit ? `（預購上限：${p.preorder_limit}）` : "";
      const details = [p.intro, limit].filter(Boolean).join(" ");
      await makeDb06(
        `商品-${p.name}`,
        Number(p.price) || null,
        Number(p.preorder_limit) || null,
        details,
        p.photoUrl || null
      );
    }

    // 體驗
    for (const e of experiences) {
      if (!e?.name) continue;
      const parts = [
        e.desc || "",
        e.duration ? `時長：${e.duration} 分鐘` : "",
        e.capacity ? `人數上限：${e.capacity}` : "",
      ].filter(Boolean);
      await makeDb06(
        `體驗-${e.name}`,
        Number(e.price) || null,
        Number(e.capacity) || null,
        parts.join(" / "),
        null
      );
    }

    // 設備（只在大於 0 或需要時建）
    if (equipment.tableCount > 0) {
      await makeDb06("設備-桌", null, Number(equipment.tableCount), "加租桌", null);
    }
    if (equipment.chairCount > 0) {
      await makeDb06("設備-椅", null, Number(equipment.chairCount), "加租椅", null);
    }
    if (equipment.needsPower) {
      await makeDb06("設備-電源", null, 1, "需要電源", null);
    }

    // 回寫 DB05「對應明細」
    if (db06Ids.length > 0) {
      try {
        const { updatePage } = await import("@/lib/notion");
        await updatePage(db05Id, {
          "對應明細": { relation: db06Ids.map((id) => ({ id })) },
        });
      } catch (e: any) {
        console.warn("DB05 對應明細 回寫失敗:", e.message);
      }
    }

    // 儲存攤商品牌資料到 members.brand_profile，下次報名自動帶入
    try {
      const email = normalizeEmail(contact.email);
      if (email) {
        await supabaseAdmin
          .from("members")
          .update({
            brand_profile: {
              type: brand.type || null,
              region: brand.region || null,
              name: brand.name || null,
              url: brand.url || null,
              keywords: brand.keywords || null,
              intro: brand.intro || null,
              motivation: brand.motivation || null,
              logoUrl: brand.logoUrl || null,
              imageUrl: brand.imageUrl || null,
              updated_at: new Date().toISOString(),
            },
          })
          .eq("email", email);
      }
    } catch (e: any) {
      console.warn("儲存 brand_profile 失敗:", e.message);
    }

    return NextResponse.json({
      success: true,
      db05Id,
      db06Count: db06Ids.length,
      message: "報名成功，審核中",
    });
  } catch (error: any) {
    console.error("Market booking error:", error);
    return NextResponse.json(
      { error: error.message || "報名失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
