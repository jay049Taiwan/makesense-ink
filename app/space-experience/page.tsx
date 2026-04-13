"use client";

import { useState } from "react";
import Calendar from "@/components/calendar/Calendar";
import RegistrationModal from "@/components/booking/RegistrationModal";

export default function SpaceExperiencePage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="mx-auto px-4" style={{ maxWidth: 1200 }}>

      {/* ═══ 上半部：文案 ═══ */}
      <section className="py-12">
        <div className="max-w-[1000px] mx-auto">
          <div
            className="aspect-[16/9] rounded-lg mb-8 flex items-center justify-center"
            style={{ background: "var(--color-parchment)" }}
          >
            <span className="text-5xl opacity-20">📷</span>
          </div>
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
          >
            空間體驗
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-teal)" }}>
            在旅人書店，找到你的空間
          </p>
          <div className="text-[0.95em] leading-[1.9] space-y-4" style={{ color: "var(--color-ink)" }}>
            <p>
              旅人書店不只是一間書店，更是一個可以容納各種可能的空間。
              無論是小型講座、工作坊、讀書會、還是私人聚會，
              我們提供溫暖而有質感的場域，讓每一場活動都能留下美好記憶。
            </p>
            <p>
              我們的空間座落於宜蘭羅東文化街，交通便利、氛圍獨特。
              歡迎查看行事曆上的可預約日期，選擇適合的時段提交租借申請。
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 下半部：空間租借行事曆 ═══ */}
      <section className="py-8 pb-16 max-w-[1000px] mx-auto" style={{ borderTop: "1px solid var(--color-dust)" }}>
        <h2 className="text-[1.5em] font-bold mb-2" style={{ color: "var(--color-ink)" }}>
          空間租借
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-mist)" }}>
          點選可預約的日期，進入租借表單
        </p>
        <Calendar
          mode="space"
          selectedDate={selectedDate}
          fetchUrl="/api/calendar/bookings"
          onDateClick={(date, timeSlot) => {
            setSelectedDate(date);
            setSelectedSlot(timeSlot || null);
            setShowBooking(true);
          }}
        />
      </section>

      {/* 空間租借彈出表單 */}
      <RegistrationModal
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        formType="空間"
        eventTitle="空間租借"
        ticketSummary={selectedDate ? `預約日期：${selectedDate} ${selectedSlot === "morning" ? "上午" : selectedSlot === "afternoon" ? "下午" : ""}` : ""}
      />
    </div>
  );
}
