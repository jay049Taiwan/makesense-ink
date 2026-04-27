import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";
import { cleanTitle } from "@/lib/clean-title";
import MarketApplyForm from "./MarketApplyForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("events")
    .select("title")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();
  return { title: data?.title ? `擺攤申請 — ${cleanTitle(data.title)}` : "擺攤申請" };
}

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function MarketApplyPage({ params }: Props) {
  const { slug, locale } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("id, notion_id, title, event_type, event_date, location, cover_url")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (!event) {
    return (
      <div className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 800 }}>
        <p className="text-base mb-2" style={{ color: "var(--color-ink)" }}>找不到此市集活動</p>
        <Link href="/market-booking" className="inline-block mt-4 px-4 py-2 rounded text-sm"
          style={{ background: "var(--color-teal)", color: "#fff" }}>
          回展售合作
        </Link>
      </div>
    );
  }

  // 驗證活動是市集類型
  const isMarket = event.event_type?.includes("市集") || event.event_type === "園遊市集";
  if (!isMarket) {
    return (
      <div className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 800 }}>
        <p className="text-base mb-2" style={{ color: "var(--color-ink)" }}>此活動不開放擺攤申請</p>
        <p className="text-sm" style={{ color: "var(--color-mist)" }}>只有市集類活動可以申請擺攤</p>
        <Link href="/market-booking" className="inline-block mt-4 px-4 py-2 rounded text-sm"
          style={{ background: "var(--color-teal)", color: "#fff" }}>
          回展售合作
        </Link>
      </div>
    );
  }

  // 已過期不開放
  const ended = event.event_date ? new Date(event.event_date) < new Date() : false;
  if (ended) {
    return (
      <div className="mx-auto px-4 py-16 text-center" style={{ maxWidth: 800 }}>
        <p className="text-base mb-2" style={{ color: "var(--color-ink)" }}>「{cleanTitle(event.title)}」已結束</p>
        <p className="text-sm" style={{ color: "var(--color-mist)" }}>追蹤我們的 IG/FB 獲知下一場市集</p>
        <Link href="/market-booking" className="inline-block mt-4 px-4 py-2 rounded text-sm"
          style={{ background: "var(--color-teal)", color: "#fff" }}>
          回展售合作
        </Link>
      </div>
    );
  }

  // 必須登入
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/market-apply/${slug}`)}`);
  }

  // 預先取得會員基本資料（自動填入聯絡欄位）
  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, name, phone, email")
    .eq("email", email!)
    .maybeSingle();

  // 已申請過 → 顯示申請狀態
  let existingApp: { id: string; status: string; vendor_name: string } | null = null;
  if (member) {
    const { data: existing } = await supabaseAdmin
      .from("market_applications")
      .select("id, status, vendor_name")
      .eq("event_id", event.id)
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingApp = existing || null;
  }

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 920 }}>
      <div className="mb-6">
        <Link href="/market-booking" className="text-sm" style={{ color: "var(--color-teal)" }}>
          ← 回展售合作
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] mb-2"
          style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          — MARKET APPLICATION —
        </p>
        <h1 className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          擺攤申請
        </h1>
        <p className="text-sm" style={{ color: "var(--color-bark)" }}>
          {cleanTitle(event.title)}
          {event.event_date && (
            <span className="ml-3" style={{ color: "var(--color-mist)" }}>
              · {new Date(event.event_date).toLocaleDateString("zh-TW")}
            </span>
          )}
          {event.location && (
            <span className="ml-3" style={{ color: "var(--color-mist)" }}>
              · 📍 {event.location}
            </span>
          )}
        </p>
      </div>

      {existingApp && (
        <div className="rounded-lg p-4 mb-6" style={{
          background: existingApp.status === "approved" ? "rgba(78,205,196,0.1)" :
                      existingApp.status === "rejected" ? "rgba(229,62,62,0.08)" :
                      "rgba(232,147,90,0.08)",
          border: `1px solid ${existingApp.status === "approved" ? "var(--color-teal)" :
                                existingApp.status === "rejected" ? "#e53e3e" : "#e8935a"}`,
        }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>
            您已申請過此市集（攤商名稱：{existingApp.vendor_name}）
          </p>
          <p className="text-xs" style={{ color: "var(--color-bark)" }}>
            目前狀態：
            {existingApp.status === "pending" && "受理中，我們會以 Email / LINE 通知結果"}
            {existingApp.status === "approved" && "🎉 已錄取！詳情會以 Email / LINE 通知"}
            {existingApp.status === "rejected" && "未錄取，歡迎下次再申請"}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--color-mist)" }}>
            若資料需要更新，可以再送出一次（會以最新一筆為準）
          </p>
        </div>
      )}

      <MarketApplyForm
        eventId={event.id}
        eventSlug={event.notion_id || event.id}
        defaultContactName={member?.name || ""}
        defaultContactPhone={member?.phone || ""}
        defaultContactEmail={member?.email || email!}
      />
    </div>
  );
}
