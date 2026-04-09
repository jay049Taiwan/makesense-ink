import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "走讀規劃",
  description: "走讀規劃報名 — 跟著在地人的腳步，用散步認識宜蘭。",
};

export default function TourBookingPage() {
  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 1200 }}>
      <h1
        className="text-3xl font-bold mb-2"
        style={{ color: "#1a1612", fontFamily: "'Noto Serif TC', serif" }}
      >
        走讀規劃
      </h1>
      <p className="text-sm mb-8" style={{ color: "#8b7355" }}>
        跟著在地人的腳步，用散步認識宜蘭
      </p>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Left: Tour list */}
        <section>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#1a1612" }}
          >
            近期走讀行程
          </h2>
          <div className="space-y-4">
            {[
              { title: "頭城老街人文散步", date: "2026-05-10", duration: "3 小時", price: 500 },
              { title: "蘭陽平原攝影散步", date: "2026-05-25", duration: "4 小時", price: 600 },
              { title: "冬山河畔生態導覽", date: "2026-06-07", duration: "2.5 小時", price: 400 },
            ].map((tour, i) => (
              <div
                key={i}
                className="rounded-lg overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: "1px solid #e8e0d4", background: "#fff" }}
              >
                <div className="flex">
                  <div
                    className="w-[180px] flex-shrink-0 flex items-center justify-center"
                    style={{ background: "#f2ede6" }}
                  >
                    <span className="text-3xl opacity-20">🚶</span>
                  </div>
                  <div className="p-4 flex-1">
                    <h3
                      className="text-[1em] font-semibold mb-1"
                      style={{ color: "#1a1612" }}
                    >
                      {tour.title}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: "#8b7355" }}>
                      {tour.date}・{tour.duration}
                    </p>
                    <p
                      className="text-[0.95em] font-medium"
                      style={{ color: "#b5522a" }}
                    >
                      NT$ {tour.price} / 人
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Booking form */}
        <section>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#1a1612" }}
          >
            報名表單
          </h2>
          <div
            className="rounded-lg p-6"
            style={{ border: "1px solid #e8e0d4", background: "#fff" }}
          >
            <p
              className="text-sm text-center py-8"
              style={{ color: "#8b7355" }}
            >
              請先從左側選擇走讀行程
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
