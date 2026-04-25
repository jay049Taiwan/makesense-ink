"use client";

import { useState } from "react";
import { CAPABILITY_GROUPS } from "@/lib/sense-data";

const GROUP_COLOR: Record<string, string> = {
  space: "var(--color-teal)",
  community: "#e8935a",
  content: "var(--color-bark)",
};

function CapabilityRow({ item, color }: { item: { name: string; weight: number; note?: string }; color: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: "10px 0", borderBottom: "1px dashed rgba(122,92,64,0.18)", cursor: "default" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>{item.name}</span>
        <span style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10, color: "var(--color-mist)", letterSpacing: "0.05em",
        }}>
          {Math.round(item.weight * 100)}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(122,92,64,0.15)", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0,
          width: `${item.weight * 100}%`, background: color,
          transition: "width 600ms ease",
        }} />
      </div>
      {item.note && (
        <div style={{
          fontSize: 11, lineHeight: 1.65, color: "var(--color-bark)",
          maxHeight: hover ? 48 : 0, opacity: hover ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 220ms, opacity 180ms, margin-top 180ms",
          marginTop: hover ? 6 : 0,
        }}>
          — {item.note}
        </div>
      )}
    </div>
  );
}

export default function Capabilities() {
  return (
    <section style={{ background: "var(--color-warm-white)" }}>
      <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
        <div className="mb-8">
          <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
            — 06 / CAPABILITIES —
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
            核心能力
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-bark)" }}>
            十二年累積出來的三組能力，彼此串連、相互支撐
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CAPABILITY_GROUPS.map((g) => {
            const color = GROUP_COLOR[g.id] || "var(--color-bark)";
            return (
              <div key={g.id} style={{
                background: "#fff",
                border: "1px solid rgba(122,92,64,0.2)",
                padding: "20px 22px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: color, display: "inline-block", flexShrink: 0,
                  }} />
                  <div>
                    <div style={{
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: 9.5, letterSpacing: "0.2em",
                      color: "var(--color-mist)", textTransform: "uppercase",
                    }}>
                      {g.sub}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500,
                      color: "var(--color-ink)",
                    }}>
                      {g.label}
                    </div>
                  </div>
                </div>
                <p style={{
                  fontSize: 12, lineHeight: 1.75,
                  color: "var(--color-bark)", marginBottom: 8,
                  paddingBottom: 8, borderBottom: "1px solid rgba(122,92,64,0.12)",
                }}>
                  {g.desc}
                </p>
                {g.items.map((it, i) => (
                  <CapabilityRow key={i} item={it} color={color} />
                ))}
              </div>
            );
          })}
        </div>

        <p className="text-[0.7em] mt-6" style={{ color: "var(--color-mist)" }}>
          能力指標為內部評估，hover 任一項目顯示備註
        </p>
      </div>
    </section>
  );
}
