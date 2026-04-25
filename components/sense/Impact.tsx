// 營運實績：6 張卡（events/partners 從 Supabase，其他寫死）
// 取代舊的「BY THE NUMBERS」6 卡區塊，改成編輯感的不規則卡片排版

import { CUSTOM_METRICS, EVENT_BREAKDOWN } from "@/lib/sense-data";

interface Stats {
  events: number;
  partners: number;
}

function MiniBars({ data, color }: { data: { k: string; v: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1fr 22px", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10.5, color: "var(--color-bark)" }}>{d.k}</span>
          <div style={{ height: 4, background: "rgba(122,92,64,0.15)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${(d.v / max) * 100}%`, background: color }} />
          </div>
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10, color: "var(--color-bark)", textAlign: "right" }}>
            {d.v}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniDots({ color }: { color: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(25, 1fr)", gap: 2, marginTop: 12 }}>
      {Array.from({ length: 75 }).map((_, i) => (
        <span key={i} style={{
          width: 3, height: 3, borderRadius: "50%",
          background: color, opacity: 0.35 + (i % 7) * 0.08,
          display: "inline-block",
        }} />
      ))}
    </div>
  );
}

function MiniNetwork({ color }: { color: string }) {
  // 簡單的節點連接示意
  const nodes = [
    [50, 30], [20, 50], [80, 50], [35, 75], [65, 75], [50, 55],
  ];
  const edges: [number, number][] = [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [0, 2], [1, 3]];
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: 70, marginTop: 12, display: "block" }}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke={color} strokeWidth="0.6" opacity="0.5" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 5 ? 3 : 2} fill={color} opacity={i === 5 ? 1 : 0.8} />
      ))}
    </svg>
  );
}

interface Card {
  id: string;
  value: number;
  unit: string;
  label: string;
  subtitle: string;
  kind: "big" | "medium" | "small";
  narrative?: string;
  highlight?: boolean;
  color: string;
  mini?: "bars" | "dots" | "network";
  breakdown?: { k: string; v: number }[];
}

export default function Impact({ stats }: { stats: Stats }) {
  const cards: Card[] = [
    {
      id: "events",
      value: stats.events > 0 ? stats.events : CUSTOM_METRICS.defaultEvents,
      unit: "場",
      label: "策劃文化活動",
      subtitle: "Events Curated",
      kind: "big",
      narrative: "從走讀、講座、市集到駐村工作坊，把文化現場帶進宜蘭每一個街區。",
      color: "var(--color-teal)",
      mini: "bars",
      breakdown: EVENT_BREAKDOWN,
    },
    {
      id: "partners",
      value: stats.partners > 0 ? stats.partners : CUSTOM_METRICS.defaultPartners,
      unit: "組",
      label: "策展合作夥伴",
      subtitle: "Partner Orgs",
      kind: "medium",
      narrative: "與公部門、在地職人、藝術家、青年團隊共築宜蘭文化網絡。",
      color: "var(--color-bark)",
      mini: "network",
    },
    {
      id: "creators",
      value: CUSTOM_METRICS.creators,
      unit: "位",
      label: "陪伴青創爸媽",
      subtitle: "Creators Supported",
      kind: "medium",
      narrative: "從品牌定位、空間運營到產品上架，一起讓育兒與創業並行。",
      highlight: true,
      color: "#e8935a",
    },
    {
      id: "spaces",
      value: CUSTOM_METRICS.spaces,
      unit: "處",
      label: "活化歷史空間",
      subtitle: "Heritage Spaces",
      kind: "medium",
      narrative: "把老屋、舊街區、閒置店面，重新接回當代生活。",
      highlight: true,
      color: "#e8935a",
    },
    {
      id: "reach",
      value: CUSTOM_METRICS.reach,
      unit: "人次",
      label: "現場參與觸及",
      subtitle: "In-person Reach",
      kind: "big",
      narrative: "每一次活動，都是一次把文化內容遞到人手上的嘗試。",
      color: "var(--color-teal)",
      mini: "dots",
    },
    {
      id: "press",
      value: CUSTOM_METRICS.press,
      unit: "則",
      label: "媒體露出 · 報導",
      subtitle: "Press Coverage",
      kind: "small",
      color: "var(--color-bark)",
    },
  ];

  return (
    <section style={{ background: "#fff" }}>
      <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="mb-8">
          <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
            — 05 / IMPACT —
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            營運實績
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-bark)" }}>
            十二年累積的文化現場
          </p>
        </div>

        {/* grid: 6 cards in editorial irregular layout
            md+: 12 columns — events(5) partners(4) creators(3) / spaces(3) reach(5) press(4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4">
          {cards.map((c) => {
            const colSpan: Record<string, string> = {
              events: "md:col-span-5",
              partners: "md:col-span-4",
              creators: "md:col-span-3",
              spaces: "md:col-span-3",
              reach: "md:col-span-5",
              press: "md:col-span-4",
            };
            return (
              <article key={c.id} className={colSpan[c.id]} style={{
                border: "1px solid rgba(122,92,64,0.2)",
                background: c.highlight ? "rgba(232,147,90,0.06)" : "#fff",
                padding: c.kind === "big" ? "20px 22px" : c.kind === "small" ? "14px 16px" : "18px 20px",
                position: "relative",
              }}>
                {c.highlight && (
                  <div style={{
                    position: "absolute", top: 10, right: 12,
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 9, letterSpacing: "0.15em", color: "#c97540",
                  }}>★ HIGHLIGHT</div>
                )}
                <div style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 9.5, letterSpacing: "0.18em",
                  color: "var(--color-mist)", marginBottom: 6, textTransform: "uppercase",
                }}>
                  {c.subtitle}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: c.kind === "big" ? 56 : c.kind === "small" ? 32 : 42,
                    fontWeight: 500,
                    color: c.color,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}>
                    {c.value.toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: c.kind === "big" ? 14 : 12,
                    color: "var(--color-bark)",
                  }}>
                    {c.unit}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-ink)", marginBottom: 6 }}>
                  {c.label}
                </div>
                {c.narrative && (
                  <p style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--color-bark)" }}>
                    {c.narrative}
                  </p>
                )}
                {c.mini === "bars" && c.breakdown && <MiniBars data={c.breakdown} color={c.color} />}
                {c.mini === "dots" && <MiniDots color={c.color} />}
                {c.mini === "network" && <MiniNetwork color={c.color} />}
              </article>
            );
          })}
        </div>

        <p className="text-[0.7em] mt-6" style={{ color: "var(--color-mist)" }}>
          活動場次與合作夥伴採官網即時統計；其餘為歷年累積資料。
        </p>
      </div>
    </section>
  );
}
