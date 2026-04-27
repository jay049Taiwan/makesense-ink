import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import YilanMap, { type MapViewpoint } from "@/components/viewpoint/YilanMap";
import { TOWNSHIPS, townshipSlugFromRegion, seedXY } from "@/lib/yilan-townships";
import { cleanTitle } from "@/lib/clean-title";

export const metadata: Metadata = {
  title: "觀點漫遊",
  description: "宜蘭縣 12 鄉鎮的文化觀點地圖 — 從在地視角延伸的散步路徑。",
};

export const revalidate = 300;

export default async function ViewpointStrollPage() {
  // 從 Supabase 撈所有 viewpoint
  const { data } = await supabase
    .from("topics")
    .select("id, notion_id, name, summary, region, tag_type, status")
    .eq("status", "active")
    .eq("tag_type", "viewpoint")
    .order("updated_at", { ascending: false })
    .limit(200);

  // 按鄉鎮分組
  type Topic = { id: string; notion_id: string; name: string; summary: string | null; region: string[] | null; township: string };
  const byTownship: Record<string, Topic[]> = {};
  const orphans: Topic[] = []; // 沒對到鄉鎮的觀點

  for (const t of data || []) {
    const slug = townshipSlugFromRegion(t.region);
    const item: Topic = {
      id: t.id,
      notion_id: t.notion_id || t.id,
      name: cleanTitle(t.name),
      summary: t.summary,
      region: Array.isArray(t.region) ? t.region : null,
      township: slug || "",
    };
    if (slug) {
      (byTownship[slug] ||= []).push(item);
    } else {
      orphans.push(item);
    }
  }

  // 建 markers：xy 沿著鄉鎮 labelAt 周圍散播
  const viewpoints: MapViewpoint[] = [];
  for (const t of TOWNSHIPS) {
    const list = byTownship[t.id] || [];
    list.forEach((topic, i) => {
      viewpoints.push({
        id: topic.notion_id,
        name: topic.name,
        township: t.id,
        xy: seedXY(t, i, list.length),
        summary: topic.summary,
      });
    });
  }

  const total = viewpoints.length;

  return (
    <div className="mx-auto px-4 py-8" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs tracking-[0.3em] mb-2"
          style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          — VIEWPOINT STROLL —
        </p>
        <h1 className="text-3xl font-semibold mb-1"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          觀點漫遊
        </h1>
        <p className="text-sm" style={{ color: "var(--color-bark)" }}>
          十二個鄉鎮，{total} 個觀點，一條條從在地視角延伸的散步路徑。
          點擊任一鄉鎮可放大查看，點擊觀點 marker 進入詳情。
        </p>
      </div>

      {/* Map */}
      <YilanMap viewpoints={viewpoints} />

      {/* 沒對到鄉鎮的觀點（行政區域沒填的話會掉到這） */}
      {orphans.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>
            其他觀點
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>
            尚未標記行政區域的觀點，補上 Notion DB08「行政區域」欄位即可顯示在地圖上。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {orphans.map((t) => (
              <Link key={t.id} href={`/viewpoint/${t.notion_id}`}
                className="rounded-lg p-4 transition-shadow hover:shadow-md"
                style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
                <h3 className="text-[0.95em] font-medium mb-1" style={{ color: "var(--color-ink)" }}>
                  {t.name}
                </h3>
                {t.summary && (
                  <p className="text-[0.75em] line-clamp-2" style={{ color: "var(--color-bark)" }}>
                    {t.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 全部空的時候 */}
      {total === 0 && orphans.length === 0 && (
        <p className="text-sm py-12 text-center" style={{ color: "var(--color-mist)" }}>
          目前沒有觀點資料。在 Notion DB08「經營類型 = 觀點」+「行政區域」+「發佈狀態 = 待發佈」並按發佈更新即可上架。
        </p>
      )}
    </div>
  );
}
