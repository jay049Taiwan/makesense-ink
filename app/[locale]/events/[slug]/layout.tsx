import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("events")
    .select("title, description, cover_url, event_date")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (!data) return { title: "活動 | 現思文化" };

  const dateStr = data.event_date
    ? new Date(data.event_date).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return {
    title: `${data.title} | 現思文化`,
    description: data.description?.slice(0, 160) || `${data.title}${dateStr ? ` — ${dateStr}` : ""}`,
    openGraph: {
      title: data.title,
      description: data.description?.slice(0, 160) || "",
      ...(data.cover_url ? { images: [{ url: data.cover_url }] } : {}),
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
