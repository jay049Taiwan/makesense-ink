import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/ui/LayoutShell";
import AuthProvider from "@/components/providers/AuthProvider";
import DevRoleProvider from "@/components/providers/DevRoleProvider";
import CartProvider from "@/components/providers/CartProvider";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

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
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "現思文化創藝術",
    title: "現思文化創藝術 | Culture Makes Sense",
    description: "以宜蘭為根，透過走讀、市集、講座與空間，串連在地職人、品牌與社群，打造地方文化的永續生態系。",
  },
  twitter: {
    card: "summary_large_image",
    title: "現思文化創藝術 | Culture Makes Sense",
    description: "以宜蘭為根，透過走讀、市集、講座與空間，串連在地職人、品牌與社群，打造地方文化的永續生態系。",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://makesense.ink",
  },
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
        <link rel="alternate" type="application/rss+xml" title="現思文化創藝術" href="/feed.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "現思文化創藝術有限公司",
              alternateName: "Culture Makes Sense",
              url: "https://makesense.ink",
              description:
                "以宜蘭為根，透過走讀、市集、講座與空間，串連在地職人、品牌與社群",
              address: {
                "@type": "PostalAddress",
                streetAddress: "文化街55號",
                addressLocality: "羅東鎮",
                addressRegion: "宜蘭縣",
                postalCode: "265",
                addressCountry: "TW",
              },
              telephone: "039-325957",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CartProvider>
            <DevRoleProvider>
              <LayoutShell>{children}</LayoutShell>
            </DevRoleProvider>
          </CartProvider>
        </AuthProvider>
        <GoogleAnalytics gaId="G-51MHE2BT74" />
        <Script id="ga4-cross-domain" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', 'G-51MHE2BT74', {
              linker: {
                domains: [
                  'makesense.ink',
                  'www.makesense.ink',
                  'bookstore.makesense.ink',
                  'cultureclub.makesense.ink',
                  'sense.makesense.ink',
                  'insight.makesense.ink'
                ]
              }
            });
          `}
        </Script>
      </body>
    </html>
  );
}
