import { supabase } from "@/lib/supabase";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";
import Timeline from "@/components/sense/Timeline";
import Impact from "@/components/sense/Impact";
import Capabilities from "@/components/sense/Capabilities";

export const revalidate = 300;

export default async function SensePage() {
  const [
    { count: eventCount },
    { count: partnerCount },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("partners").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const stats = {
    events: eventCount || 0,
    partners: partnerCount || 0,
  };

  return (
    <div>
      {/* ════════════════════════════════════════
          Hero：品牌介紹（保留原本上半部）
          ════════════════════════════════════════ */}
      <section className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center" style={{ background: "var(--color-parchment)" }}>
          <ImagePlaceholder type="default" />
        </div>
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            現思文化創藝術
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-teal)", fontFamily: "var(--font-display)", fontStyle: "italic" }}>
            Culture Makes Sense
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>現思文化創藝術有限公司成立於 2012 年，以宜蘭在地文化為核心，透過旅人書店與宜蘭文化俱樂部兩大品牌，串連地方文化、創意產業與社群網絡，致力於打造地方文化的永續生態系。</p>
            <p>我們相信，文化不只是被保存的對象，更是可以被體驗、被參與、被創造的日常。從一間街角書店出發，我們走進社區、走入田野、走上舞台，用市集連結在地職人，用走讀喚醒土地記憶，用出版記錄時代切片。</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          下半部：發展歷程 / 營運實績 / 核心能力
          ════════════════════════════════════════ */}
      <Timeline />
      <Impact stats={stats} />
      <Capabilities />
    </div>
  );
}
