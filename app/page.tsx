import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Culture Make Sense | 現思文化創藝術",
  description: "現思文化創藝術有限公司 — Culture Make Sense",
};

export default function HomePage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <h1
        className="text-4xl sm:text-6xl font-serif tracking-wide"
        style={{
          color: "#7a5c40",
          fontFamily: "'Playfair Display', 'Noto Serif TC', serif",
        }}
      >
        Culture Make Sense
      </h1>
    </div>
  );
}
