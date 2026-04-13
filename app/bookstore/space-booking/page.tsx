"use client";

import { useState } from "react";
import RegistrationModal from "@/components/booking/RegistrationModal";

const spaces = [
  {
    id: "s1",
    name: "宜蘭文學館室內空間",
    capacity: "30 人",
    area: "約 40 坪",
    halfDay: 3000,
    fullDay: 5000,
    features: ["投影設備", "音響系統", "桌椅 30 套", "Wi-Fi"],
    photo: null,
  },
  {
    id: "s2",
    name: "成功國小校長宿舍室內空間",
    capacity: "20 人",
    area: "約 25 坪",
    halfDay: 2000,
    fullDay: 3500,
    features: ["日式建築", "庭園景觀", "桌椅 15 套", "Wi-Fi"],
    photo: null,
  },
  {
    id: "s3",
    name: "羅東樟仔園文化園區",
    capacity: "80 人",
    area: "約 120 坪（含戶外）",
    halfDay: 5000,
    fullDay: 8000,
    features: ["室內外空間", "大型活動適用", "停車場", "公共廁所"],
    photo: null,
  },
  {
    id: "s4",
    name: "旅人書店一樓",
    capacity: "15 人",
    area: "約 12 坪",
    halfDay: 1500,
    fullDay: 2500,
    features: ["書店氛圍", "咖啡吧台", "桌椅 12 套"],
    photo: null,
  },
];

const blockedDates = ["2026-04-14", "2026-04-15", "2026-04-20", "2026-05-01", "2026-05-02"];

export default function SpaceBookingPage() {
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const space = spaces.find((s) => s.id === selectedSpace);

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-12">
      <h1 className="text-3xl font-bold font-serif mb-2" style={{ color: "var(--color-ink)" }}>
        空間租借
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-mist)" }}>
        選擇空間，預約您的文化活動場地
      </p>

      {/* 空間卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {spaces.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSpace(s.id)}
            className="text-left rounded-xl overflow-hidden transition-all"
            style={{
              background: "#fff",
              border: selectedSpace === s.id ? "1.5px solid #4ECDC4" : "1px solid var(--color-dust)",
              boxShadow: selectedSpace === s.id ? "0 2px 12px rgba(78,205,196,0.15)" : "none",
            }}
          >
            <div
              className="aspect-[16/7] flex items-center justify-center"
              style={{ background: "var(--color-parchment)" }}
            >
              <span className="text-3xl opacity-20">📷</span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-ink)" }}>{s.name}</h3>
              <p className="text-xs mb-2" style={{ color: "var(--color-mist)" }}>
                容納 {s.capacity} ・ {s.area}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {s.features.map((f) => (
                  <span
                    key={f}
                    className="text-[0.6em] px-1.5 py-0.5 rounded"
                    style={{ background: "var(--color-parchment)", color: "var(--color-bark)" }}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 text-xs" style={{ color: "var(--color-ink)" }}>
                <span>半日 <strong>${s.halfDay.toLocaleString()}</strong></span>
                <span>全日 <strong>${s.fullDay.toLocaleString()}</strong></span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 預約區 */}
      {space && (
        <div className="rounded-xl p-6" style={{ background: "var(--color-warm-white)", border: "1.5px solid #4ECDC4" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                {space.name}
              </h2>
              <p className="text-xs" style={{ color: "var(--color-mist)" }}>
                半日 ${space.halfDay.toLocaleString()} / 全日 ${space.fullDay.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--color-moss)" }}
            >
              填寫預約表單
            </button>
          </div>

          {/* 封鎖日期提醒 */}
          <div className="p-3 rounded-lg text-xs" style={{ background: "#FFF8E7", borderLeft: "4px solid #F5A623", color: "#6B4E00" }}>
            <strong>已封鎖日期</strong>：{blockedDates.map((d) => d.slice(5)).join("、")}（已有預約或維護）
          </div>
        </div>
      )}

      {/* Modal */}
      {space && (
        <RegistrationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          formType="空間"
          eventTitle={space.name}
          ticketSummary={`空間租借申請`}
        />
      )}
    </div>
  );
}
