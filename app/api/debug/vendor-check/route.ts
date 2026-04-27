import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryDatabase, DB } from "@/lib/notion";
import { normalizeEmail } from "@/lib/email";

/**
 * 診斷工具：查詢目前登入者的 DB08 資料，確認 role 為何
 * GET /api/debug/vendor-check
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const rawEmail = session.user.email;
  const email = normalizeEmail(rawEmail);

  // 查 DB08 所有符合 email 的 entry（不加 role filter）
  let allEntries: any[] = [];
  try {
    allEntries = await queryDatabase(
      DB.DB08_RELATIONSHIP,
      { property: "Email", rich_text: { equals: email } },
      undefined,
      10
    );
  } catch (e: any) {
    return NextResponse.json({ error: "Notion 查詢失敗: " + e.message }, { status: 500 });
  }

  const parsed = allEntries.map((page: any) => {
    const props = page.properties;
    const getTitle = (p: any) => (p?.title || []).map((t: any) => t.plain_text).join("");
    const getText = (p: any) => (p?.rich_text || []).map((t: any) => t.plain_text).join("");
    const getSelect = (p: any) => p?.select?.name || null;
    const getStatus = (p: any) => p?.status?.name || null;

    return {
      notion_page_id: page.id,
      經營名稱: getTitle(props["經營名稱"]),
      Email_in_notion: getText(props["Email"]),
      會員狀態: getStatus(props["會員狀態"]),
      關係選項: getSelect(props["關係選項"]),
      created_time: page.created_time,
    };
  });

  // 模擬 checkIsVendor / checkIsStaff 的結果
  const isVendorMatch = parsed.some(
    (e) => e.會員狀態 === "會員" && e.關係選項 === "合作夥伴"
  );
  const isStaffMatch = parsed.some(
    (e) => e.會員狀態 === "會員" && e.關係選項 === "工作團隊"
  );

  return NextResponse.json({
    login_email_raw: rawEmail,
    login_email_normalized: email,
    db08_entries_found: parsed.length,
    db08_entries: parsed,
    role_result: isStaffMatch ? "staff" : isVendorMatch ? "vendor" : "member",
    diagnosis: parsed.length === 0
      ? "❌ DB08 沒有找到這個 email — 可能未填寫 Email 欄位，或是打錯字"
      : parsed.length > 1
      ? "⚠️ 找到多筆 entry（可能有重複）"
      : isVendorMatch
      ? "✅ 找到 合作夥伴 entry，role 應為 vendor"
      : isStaffMatch
      ? "✅ 找到 工作團隊 entry，role 應為 staff"
      : `⚠️ 找到 entry 但 role 不符：會員狀態=${parsed[0].會員狀態}，關係選項=${parsed[0].關係選項}`,
  });
}
