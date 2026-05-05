import { supabaseAdmin as supabase } from "./supabase";

/**
 * Rich Menu IDs (v5)
 * 可用環境變數覆寫；預設值是 LINE 後台已建好的 ID
 */
const RM_MEMBER = process.env.LINE_RICHMENU_MEMBER || "richmenu-4b389bb77c53aad7d182da8b37ed9744";
const RM_PARTNER_SHOP = process.env.LINE_RICHMENU_PARTNER_SHOP || "richmenu-ac6f7c36d99ef128e4c8ba34c4bf9aca";
// const RM_PARTNER_MGMT = process.env.LINE_RICHMENU_PARTNER_MGMT || "richmenu-b0cc83effc8e09d37d57c23ba8f0f3cf";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function bindMenu(lineUid: string, richMenuId: string): Promise<boolean> {
  if (!TOKEN) {
    console.warn("[line-richmenu] no LINE_CHANNEL_ACCESS_TOKEN");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/user/${lineUid}/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Length": "0",
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[line-richmenu] bind ${richMenuId} failed: ${res.status} ${text}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[line-richmenu] bind error: ${err.message}`);
    return false;
  }
}

/**
 * 依會員角色綁定對應 Rich Menu
 * - 合作廠商 → partner-shop（廠商一般 tab，可切到 mgmt）
 * - 一般會員 / 訪客 → member
 */
export async function bindRichMenuByRole(lineUid: string): Promise<{
  ok: boolean;
  role: "partner" | "member";
  menuId: string;
}> {
  // 找 member.email
  const { data: member } = await supabase
    .from("members")
    .select("email")
    .eq("line_uid", lineUid)
    .maybeSingle();

  let role: "partner" | "member" = "member";
  let menuId = RM_MEMBER;

  if (member?.email) {
    const { data: partner } = await supabase
      .from("partners")
      .select("notion_id")
      .filter("contact->>email", "eq", member.email)
      .maybeSingle();
    if (partner) {
      role = "partner";
      menuId = RM_PARTNER_SHOP;
    }
  }

  const ok = await bindMenu(lineUid, menuId);
  return { ok, role, menuId };
}
