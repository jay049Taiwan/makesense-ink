import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { localeToHtmlLang } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import LayoutShell from "@/components/ui/LayoutShell";
import AuthProvider from "@/components/providers/AuthProvider";
import DevRoleProvider from "@/components/providers/DevRoleProvider";
import CartProvider from "@/components/providers/CartProvider";
import LiffProvider from "@/components/providers/LiffProvider";
import { Suspense } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import PageViewTracker from "@/components/tracking/PageViewTracker";
import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    zh: "現思文化創藝術 | makesense",
    en: "Culture Makes Sense | makesense",
    ja: "カルチャーメイクセンス | makesense",
    ko: "컬처메이크센스 | makesense",
  };
  const descriptions: Record<string, string> = {
    zh: "現思文化創藝術有限公司 — 旅人書店、宜蘭文化俱樂部，以宜蘭在地文化為核心的品牌事業。",
    en: "Culture Makes Sense — Traveler Bookstore & Yilan Culture Club. A local cultural brand rooted in Yilan, Taiwan.",
    ja: "カルチャーメイクセンス — 旅人書店・宜蘭文化クラブ。台湾宜蘭の地域文化を発信するブランド事業。",
    ko: "컬처메이크센스 — 여행자서점 & 이란문화클럽. 대만 이란의 지역 문화를 기반으로 한 브랜드 사업.",
  };
  const ogDescs: Record<string, string> = {
    zh: "以宜蘭為根，透過走讀、市集、講座與空間，串連在地職人、品牌與社群，打造地方文化的永續生態系。",
    en: "Rooted in Yilan, connecting local artisans, brands and communities through reading tours, markets, lectures and spaces — building a sustainable local culture ecosystem.",
    ja: "宜蘭を拠点に、読書ツアー、マーケット、講座、スペースを通じて地元の職人・ブランド・コミュニティをつなぎ、地域文化の持続可能なエコシステムを構築。",
    ko: "이란을 기반으로 독서 투어, 마켓, 강좌, 공간을 통해 지역 장인, 브랜드, 커뮤니티를 연결하여 지속 가능한 지역 문화 생태계를 구축합니다.",
  };

  return {
    title: {
      default: titles[locale] || titles.zh,
      template: `%s | ${locale === "zh" ? "現思文化創藝術" : "makesense"}`,
    },
    description: descriptions[locale] || descriptions.zh,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://makesense.ink"),
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_TW" : locale,
      siteName: locale === "zh" ? "現思文化創藝術" : "Culture Makes Sense",
      title: titles[locale] || titles.zh,
      description: ogDescs[locale] || ogDescs.zh,
    },
    twitter: {
      card: "summary_large_image",
      title: titles[locale] || titles.zh,
      description: ogDescs[locale] || ogDescs.zh,
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: locale === "zh" ? "https://makesense.ink" : `https://makesense.ink/${locale}`,
      languages: {
        "zh-TW": "https://makesense.ink",
        en: "https://makesense.ink/en",
        ja: "https://makesense.ink/ja",
        ko: "https://makesense.ink/ko",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const htmlLang = localeToHtmlLang[locale as Locale] || "zh-TW";

  return (
    <html lang={htmlLang} className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Noto+Sans+TC:wght@300;400;500;600;700&family=Noto+Serif+TC:wght@400;600;700&family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="alternate" type="application/rss+xml" title="現思文化創藝術" href="/feed.xml" />
        <meta name="theme-color" content="#7a5c40" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "現思文化創藝術有限公司",
              alternateName: "Culture Makes Sense",
              url: "https://makesense.ink",
              description: "以宜蘭為根，透過走讀、市集、講座與空間，串連在地職人、品牌與社群",
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
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CartProvider>
              <LiffProvider>
                <DevRoleProvider>
                  <LayoutShell>{children}</LayoutShell>
                  <Suspense fallback={null}><PageViewTracker /></Suspense>
                </DevRoleProvider>
              </LiffProvider>
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
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
