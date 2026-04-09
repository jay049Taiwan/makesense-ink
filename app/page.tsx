import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Culture Makes Sense | 現思文化創藝術",
  description: "現思文化創藝術有限公司 — Culture Makes Sense",
};

export default function HomePage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <h1
        className="text-4xl sm:text-5xl lg:text-6xl tracking-wide"
        style={{
          color: "#4ECDC4",
          fontFamily: "'Playfair Display', 'Noto Serif TC', serif",
          fontWeight: 400,
          fontStyle: "italic",
        }}
      >
        Culture Makes Sense
      </h1>
    </div>
  );
}
