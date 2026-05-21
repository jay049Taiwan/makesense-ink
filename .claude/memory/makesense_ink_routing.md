---
name: makesense.ink 路由與頁面決定
description: 確認的路由結構、購物車整併、文章格式簡化等架構決定
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
> ⚠️ **[LEGACY / 2026/04 前的早期規劃]** 本文件為 makesense.ink 2026/04/09 當時的路由規劃。makesense_ink_tech.md / _vision.md / _supabase_migration_done.md 有更新版架構；多語言（next-intl）、商品篩選、三入口等後續決定請以那些文件為準。

## 確認的路由結構（2026-04-09）
```
/                         → "Culture Make Sense"（一句話）
/bookstore/               → 旅人書店首頁（10 個區塊）
/cultureclub/             → 宜蘭文化俱樂部首頁（10 個區塊）
/sense/                   → 現思文化（品牌框架 + 同行的人 + 核心能力 + 時間軸）
/viewpoint-stroll/        → 觀點漫遊（篩選 + 內容網格）
/themed-selection/        → 主題選書（篩選 + 商品網格）
/goods-selection/         → 風格選物（篩選 + 商品網格）
/local-school/            → 地方學堂（先留骨架，WP 上也還沒建）
/market-booking/          → 展售合作（市集報名）
/space-booking/           → 空間體驗（場地預約）
/checkout/                → 購物車+結帳（合併為一頁）
/product/[slug]/          → 產品單頁
/events/[slug]/           → 活動單頁
/post/[slug]/             → 文章單頁（簡化格式，不用 /year/month/day/）
/dashboard/               → 會員中心（三種角色）
```

## 關鍵決定
- 購物車 + 結帳整併為 `/checkout/` 一頁
- 文章網址從 `/{year}/{month}/{day}/{slug}/` 簡化為 `/post/{slug}/`
- 地方學堂先留骨架
- Footer 連結：關於我們（→/sense/）、異業合作（→/market-booking/）、空間體驗（→/space-booking/）

**Why:** 四九 要求比 WordPress 更好修改、結構更清晰
**How to apply:** 所有頁面建構依此路由表為準，Notion 指南有出入時以此為準
