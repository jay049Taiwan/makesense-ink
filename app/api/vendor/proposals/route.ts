export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchVendorProfile } from "@/lib/fetch-all";
import { createPage, DB } from "@/lib/notion";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session as any)?.role;
  const email = session?.user?.email;

  if (!session || role !== "vendor" || !email) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { title, type, content, fileUrl } = await req.json() as any;

  if (!title?.trim()) {
    return NextResponse.json({ error: "請輸入提案名稱" }, { status: 400 });
  }

  try {
    const vendor = await fetchVendorProfile(email);

    const properties: Record<string, any> = {
      "專案名稱": { title: [{ text: { content: title.trim() } }] },
      "執行狀態": { status: { name: "預計提案" } },
    };

    if (type) properties["提案類型"] = { select: { name: type } };
    if (fileUrl) properties["資料連結"] = { url: fileUrl };
    if (vendor?.id) properties["對應提案標籤"] = { relation: [{ id: vendor.id }] };

    const children: any[] = [];
    if (content?.trim()) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: content.trim() } }],
        },
      });
    }

    const page = await createPage(DB.DB01_RESOURCE, properties) as any;

    return NextResponse.json({ id: page.id });
  } catch (e) {
    console.error("create proposal error:", e);
    return NextResponse.json({ error: "建立失敗，請稍後再試" }, { status: 500 });
  }
}
