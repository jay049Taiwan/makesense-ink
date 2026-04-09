import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的宜蘭",
};

const attributes = [
  { name: "山", color: "bg-green-600" },
  { name: "海", color: "bg-blue-500" },
  { name: "田", color: "bg-yellow-600" },
  { name: "藝", color: "bg-purple-500" },
  { name: "人", color: "bg-rose-500" },
];

export default function YilanMapPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-brand-brown mb-6">我的宜蘭</h2>

      {/* Level & points */}
      <div className="flex items-center gap-6 mb-8">
        <div className="text-center">
          <p className="text-sm text-muted">目前等級</p>
          <p className="text-4xl font-bold text-brand-teal">Lv.1</p>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-sm text-muted mb-1">
            <span>0 點</span>
            <span>500 點（升級 Lv.2）</span>
          </div>
          <div className="h-3 rounded-full bg-brand-cream overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-teal transition-all"
              style={{ width: "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="flex gap-3 mb-8">
        {attributes.map((attr) => (
          <div
            key={attr.name}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-border text-sm"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${attr.color}`} />
            <span>{attr.name}</span>
          </div>
        ))}
      </div>

      {/* Map placeholder */}
      <div className="rounded-xl border border-border bg-brand-cream aspect-square max-w-[600px] flex items-center justify-center text-muted">
        <div className="text-center">
          <p className="text-lg mb-2">宜蘭互動地圖</p>
          <p className="text-sm">14×14 像素風格等距地圖</p>
          <p className="text-sm">Canvas 渲染，隨等級解鎖地點</p>
        </div>
      </div>
    </div>
  );
}
