import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: {
    default: "現思文化創藝術 | makesense",
    template: "%s | 現思文化創藝術",
  },
  description:
    "現思文化創藝術有限公司 — 旅人書店、宜蘭文化俱樂部，以宜蘭在地文化為核心的品牌事業。",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://makesense.ink"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Noto+Sans+TC:wght@300;400;500;600;700&family=Noto+Serif+TC:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
