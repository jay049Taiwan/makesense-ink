import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("topics")
    .select("name, summary")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (!data) return { title: "觀點 | 宜蘭文化俱樂部" };

  return {
    title: `${data.name} | 宜蘭文化俱樂部`,
    description: data.summary?.slice(0, 160) || `${data.name} — 宜蘭在地文化觀點`,
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
