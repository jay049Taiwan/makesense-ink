import { fetchSBTopics, fetchSBPersons } from "@/lib/fetch-supabase";
import ReadingTourClient from "./ReadingTourClient";

export const metadata = {
  title: "走讀漫遊",
  description: "走讀漫遊 — 走進宜蘭的每一個角落。",
};

export default async function ReadingTourPage() {
  const [topics, persons] = await Promise.all([
    fetchSBTopics(undefined, 100),
    fetchSBPersons(undefined, 200),
  ]);

  // 走讀關鍵字：取 tag_type 為 tag 的 topics
  const keywords = topics.slice(0, 10).map(t => ({ name: t.name, slug: t.slug }));

  // 地點：從 persons 中篩選空間/地點類型，按 type 分群
  // 如果沒有分區資料，就按 type 分群
  const locationPersons = persons.filter(p => p.type && ["空間", "景點", "地點", "場域"].some(k => p.type?.includes(k)));

  // 如果 DB 裡沒有空間類型的 persons，就用 topics 當地點
  const locationData = locationPersons.length > 0
    ? locationPersons.map(p => ({ name: p.name, type: p.type || "景點", slug: p.slug }))
    : topics.slice(0, 22).map(t => ({ name: t.name, type: t.tag_type || "關鍵字", slug: t.slug }));

  // 分區邏輯：簡單地平分為三組
  const third = Math.ceil(locationData.length / 3);
  const regions: Record<string, typeof locationData> = {
    溪北: locationData.slice(0, third),
    溪南: locationData.slice(third, third * 2),
    縣外: locationData.slice(third * 2),
  };

  const tourTotal = topics.length;

  return <ReadingTourClient keywords={keywords} regions={regions} tourTotal={tourTotal} />;
}
