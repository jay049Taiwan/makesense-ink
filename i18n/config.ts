export const locales = ["zh", "en", "ja", "ko"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export const localeNames: Record<Locale, string> = {
  zh: "繁中",
  en: "EN",
  ja: "日本語",
  ko: "한국어",
};

/** HTML lang 屬性 */
export const localeToHtmlLang: Record<Locale, string> = {
  zh: "zh-TW",
  en: "en",
  ja: "ja",
  ko: "ko",
};
