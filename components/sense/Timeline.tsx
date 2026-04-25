"use client";

import { useState } from "react";
import { TIMELINE_EVENTS, PHASES, type TimelineEvent, type Phase, type EventType } from "@/lib/sense-data";

const TYPE_META: Record<EventType, { label: string; color: string; shape: "diamond" | "star" | "circle" }> = {
  milestone: { label: "里程碑", color: "var(--color-teal)", shape: "diamond" },
  award: { label: "獲獎", color: "#e8935a", shape: "star" },
  event: { label: "活動", color: "var(--color-bark)", shape: "circle" },
};

const PHASE_TINT: Record<string, { band: string; accent: string }> = {
  seed: { band: "rgba(184, 158, 122, 0.18)", accent: "#7a5c40" },
  founding: { band: "rgba(78, 205, 196, 0.18)", accent: "#2da89e" },
  expansion: { band: "rgba(232, 147, 90, 0.16)", accent: "#c97540" },
  now: { band: "rgba(122, 92, 64, 0.18)", accent: "#7a5c40" },
};

const YEAR_END = 2026;

function phaseYears(p: Phase): [number, number] {
  const m = p.range.match(/(\d{4})\s*[–-]\s*(\d{4})?/);
  if (!m) return [2012, YEAR_END];
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : YEAR_END];
}

function EventMark({ type, active }: { type: EventType; active: boolean }) {
  const meta = TYPE_META[type] || TYPE_META.event;
  const size = active ? 14 : 10;
  if (meta.shape === "diamond") {
    return (
      <svg width={size} height={size} viewBox="-7 -7 14 14" style={{ display: "block" }}>
        <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill={meta.color} />
      </svg>
    );
  }
  if (meta.shape === "star") {
    return (
      <svg width={size} height={size} viewBox="-7 -7 14 14" style={{ display: "block" }}>
        <polygon points="0,-6 1.6,-1.8 6,-1.8 2.4,1 3.8,5.4 0,2.8 -3.8,5.4 -2.4,1 -6,-1.8 -1.6,-1.8" fill={meta.color} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="-7 -7 14 14" style={{ display: "block" }}>
      <circle r={size / 2 - 1} fill={meta.color} />
    </svg>
  );
}

export default function Timeline() {
  const [hovered, setHovered] = useState<TimelineEvent | null>(null);

  // phase 的色帶寬度按年數比例（短階段最少 18%）
  const totalSpan = YEAR_END - 2012 + 1;
  const rawW = PHASES.map(p => {
    const [ps, pe] = phaseYears(p);
    const yc = pe - ps + 1;
    return yc <= 3 ? Math.max(yc / totalSpan, 0.18) : yc / totalSpan;
  });
  const sumW = rawW.reduce((a, b) => a + b, 0);
  const phaseW = rawW.map(w => w / sumW);
  const gridTpl = phaseW.map(w => `${w}fr`).join(" ");
  const isOpen = PHASES[PHASES.length - 1].range.trim().endsWith("–");

  // year markers
  const marks: { year: number; pos: number; tx: string }[] = [];
  let cum = 0;
  PHASES.forEach((p, i) => {
    const [ps, pe] = phaseYears(p);
    const w = phaseW[i] * 100;
    if (i === 0) marks.push({ year: ps, pos: 0, tx: "translateX(0)" });
    marks.push({
      year: pe,
      pos: cum + w,
      tx: i === PHASES.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
    });
    cum += w;
  });
  const seen = new Set<number>();
  const uniqMarks = marks.filter(m => (seen.has(m.year) ? false : (seen.add(m.year), true)));

  return (
    <section style={{ background: "var(--color-warm-white)" }}>
      <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="mb-7">
          <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
            — 04 / TIMELINE —
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            發展歷程
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-bark)" }}>
            2012 — 2026　從一群人的週末走讀，到地方文化生態系
          </p>
        </div>

        {/* phase color band axis */}
        <div className="mb-2 hidden md:block" style={{ position: "relative" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: gridTpl,
            height: 28,
            border: "1px solid var(--color-ink)",
          }}>
            {PHASES.map((p, i) => {
              const tint = PHASE_TINT[p.id];
              return (
                <div key={p.id} style={{
                  background: tint.band,
                  borderRight: i < PHASES.length - 1 ? "1px solid var(--color-ink)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 10.5, letterSpacing: "0.15em",
                  color: tint.accent, textTransform: "uppercase",
                }}>
                  <span style={{ padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.sub}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ position: "relative", height: 24, marginTop: 0 }}>
            {uniqMarks.map((m, i) => (
              <div key={i} style={{
                position: "absolute", left: `${m.pos}%`, transform: m.tx, top: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <div style={{ width: 1, height: 6, background: "var(--color-ink)" }} />
                <div style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 11, color: "var(--color-ink)", whiteSpace: "nowrap",
                }}>
                  {m.year}{m.year === YEAR_END && isOpen ? " →" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* phase columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 mt-6">
          {PHASES.map((p, i) => {
            const evs = TIMELINE_EVENTS.filter(e => e.phase === p.id);
            const milestones = evs.filter(e => e.type === "milestone" || e.type === "award");
            const tint = PHASE_TINT[p.id];
            return (
              <div key={p.id} style={{
                padding: "16px 18px",
                borderTop: "1px dashed rgba(122,92,64,0.25)",
                borderLeft: i > 0 ? "1px dashed rgba(122,92,64,0.25)" : undefined,
              }} className={i > 0 ? "md:border-l" : ""}>
                <div style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 10, letterSpacing: "0.2em",
                  color: "var(--color-mist)", marginBottom: 6, textTransform: "uppercase",
                }}>
                  PHASE {String(i + 1).padStart(2, "0")} · {p.sub}
                </div>
                <div style={{
                  fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500,
                  color: "var(--color-ink)", marginBottom: 4,
                }}>
                  {p.label}
                </div>
                <div style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 11, color: tint.accent, marginBottom: 10, fontWeight: 500,
                }}>
                  {p.range}
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.75, color: "var(--color-bark)", marginBottom: 14 }}>
                  {p.desc}
                </p>

                <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, color: "var(--color-ink)" }}>
                      {evs.length}
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--color-mist)", letterSpacing: "0.1em" }}>累積紀錄</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, color: tint.accent }}>
                      {milestones.length}
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--color-mist)", letterSpacing: "0.1em" }}>關鍵節點</div>
                  </div>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {milestones.map((e, idx) => (
                    <li key={idx}
                      onMouseEnter={() => setHovered(e)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ padding: "4px 0", borderBottom: "1px dashed rgba(122,92,64,0.18)", cursor: "default" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <EventMark type={e.type} active={hovered === e} />
                        <span style={{
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                          fontSize: 10, color: "var(--color-mist)",
                        }}>{e.date}</span>
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--color-ink)", lineHeight: 1.5, display: "block" }}>
                        {e.title}
                        {e.note && hovered === e && (
                          <span style={{ display: "block", fontSize: 10.5, color: "var(--color-bark)", marginTop: 4 }}>
                            — {e.note}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-8 flex flex-wrap items-center gap-5" style={{ fontSize: 11, color: "var(--color-bark)" }}>
          {(["milestone", "award", "event"] as EventType[]).map(k => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <EventMark type={k} active={false} />
              {TYPE_META[k].label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
