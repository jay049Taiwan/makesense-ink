import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

/**
 * POST /api/liff/partner/me
 * Body: { accessToken: string }
 *
 * 驗證 LIFF accessToken → 反查 members.email → 比對 partners.contact->>'email'
 * 回傳 partner 身份（找不到代表非合作廠商）
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "缺少 accessToken" }, { status: 400 });
    }

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ ok: false, message: "LINE token 無效" }, { status: 401 });
    }
    const profile = await profileRes.json();
    const lineUid = profile.userId;

    const { data: member } = await supabase
      .from("members")
      .select("id, email, name")
      .eq("line_uid", lineUid)
      .maybeSingle();

    if (!member?.email) {
      return NextResponse.json({ ok: true, partner: null, reason: "no-member-or-email" });
    }

    // partners.contact 是 jsonb，用 ->>'email' 比對
    const { data: partner } = await supabase
      .from("partners")
      .select("id, notion_id, name, type, contact, status")
      .filter("contact->>email", "eq", member.email)
      .maybeSingle();

    if (!partner) {
      return NextResponse.json({ ok: true, partner: null, reason: "not-a-partner" });
    }

    return NextResponse.json({
      ok: true,
      partner: {
        id: partner.id,
        notion_id: partner.notion_id,
        name: partner.name,
        type: partner.type,
        status: partner.status,
      },
      member: { id: member.id, name: member.name, email: member.email },
    });
  } catch (err: any) {
    console.error("[liff/partner/me] error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
