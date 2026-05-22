import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 效能追蹤：每 10 筆 pageview 抽 1 筆（免費方案省配額）
  tracesSampleRate: 0.1,

  // Session Replay：錯誤發生時錄製重播（免費 500 replays/月）
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 本機開發不送 Sentry，避免污染資料
  enabled: process.env.NODE_ENV === "production",
});
