import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("products")
    .select("name, description, images, price")
    .or(`notion_id.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (!data) return { title: "商品 | 旅人書店" };

  let photo: string | undefined;
  try { const imgs = JSON.parse(data.images || "[]"); photo = imgs[0]; } catch {}

  return {
    title: `${data.name} | 旅人書店`,
    description: data.description?.slice(0, 160) || `${data.name} — NT$ ${data.price}`,
    openGraph: {
      title: data.name,
      description: data.description?.slice(0, 160) || `NT$ ${data.price}`,
      ...(photo ? { images: [{ url: photo }] } : {}),
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
