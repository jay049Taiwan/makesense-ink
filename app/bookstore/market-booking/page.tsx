"use client";

import { useState } from "react";
import RegistrationModal from "@/components/booking/RegistrationModal";

const mockMarketDates = [
  { id: "m1", date: "2026/05/10（六）", title: "森本集市｜春日好物市集", slots: 30, filled: 22, status: "報名中" as const },
  { id: "m2", date: "2026/06/07（六）", title: "森本集市｜夏日風味市集", slots: 25, filled: 0, status: "即將開放" as const },
  { id: "m3", date: "2026/07/05（六）", title: "森本集市｜盛夏手作市集", slots: 25, filled: 0, status: "即將開放" as const },
];

export default function MarketBookingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const selectedMarket = mockMarketDates.find((m) => m.id === selected);

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-12">
      <h1 className="text-3xl font-bold font-serif mb-2" style={{ color: "var(--color-ink)" }}>
        展售合作
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
        選擇想參加的市集場次，填寫品牌報名表單
      </p>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* 場次列表 */}
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-bark)" }}>
            市集場次
          </h2>
          <div className="space-y-3">
            {mockMarketDates.map((m) => (
              <button
                key={m.id}
                onClick={() => m.status === "報名中" ? setSelected(m.id) : undefined}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{
                  background: selected === m.id ? "rgba(78,205,196,0.06)" : "#fff",
                  border: selected === m.id ? "1.5px solid #4ECDC4" : "1px solid var(--color-dust)",
                  opacity: m.status === "報名中" ? 1 : 0.6,
                  cursor: m.status === "報名中" ? "pointer" : "default",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{m.title}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-mist)" }}>{m.date}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-[0.65em] px-2 py-0.5 rounded-full"
                      style={{
                        background: m.status === "報名中" ? "rgba(78,205,196,0.12)" : "var(--color-parchment)",
                        color: m.status === "報名中" ? "#3aa89f" : "var(--color-mist)",
                      }}
                    >
                      {m.status}
                    </span>
                    {m.status === "報名中" && (
                      <p className="text-[0.6em] mt-1" style={{ color: "var(--color-mist)" }}>
                        {m.filled}/{m.slots} 已報名
                      </p>
                    )}
                  </div>
                </div>
                {m.status === "報名中" && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-parchment)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(m.filled / m.slots) * 100}%`, background: "#4ECDC4" }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg text-xs" style={{ background: "var(--color-warm-white)", color: "var(--color-mist)" }}>
            <p className="font-medium mb-1" style={{ color: "var(--color-bark)" }}>攤位費用說明</p>
            <p>一般攤位 $2,000/日 ・ 友善農食攤位 $1,500/日</p>
            <p>含桌×1、椅×2、帳篷×1，其餘設備可加租</p>
          </div>
        </section>

        {/* 右側：報名摘要 */}
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-bark)" }}>
            報名摘要
          </h2>
          <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid var(--color-dust)" }}>
            {selectedMarket ? (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--color-ink)" }}>
                  {selectedMarket.title}
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>
                  {selectedMarket.date}
                </p>
                <div className="text-xs space-y-2 mb-5" style={{ color: "var(--color-bark)" }}>
                  <p>剩餘攤位：{selectedMarket.slots - selectedMarket.filled} 個</p>
                  <p>報名需提供：品牌資料 + Logo + 商品照</p>
                  <p>審核時間：約 3-5 個工作日</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full h-10 rounded-lg text-sm font-medium text-white"
                  style={{ background: "var(--color-moss)" }}
                >
                  填寫報名表
                </button>
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: "var(--color-mist)" }}>
                請先選擇市集場次
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Modal */}
      {selectedMarket && (
        <RegistrationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          formType="市集"
          eventTitle={selectedMarket.title}
          ticketSummary={`攤位報名 ・ ${selectedMarket.date}`}
        />
      )}
    </div>
  );
}
