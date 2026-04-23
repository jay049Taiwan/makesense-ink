import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";

/**
 * GET /api/user/vendor-profile
 * 回傳該會員上次市集報名的 brand_profile（供報名表單 defaultValue 帶入）
 */
export async function GET() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) return NextResponse.json({ profile: null });

  const { data } = await supabaseAdmin
    .from("members")
    .select("brand_profile")
    .eq("email", email)
    .maybeSingle();

  return NextResponse.json({ profile: data?.brand_profile || null });
}
