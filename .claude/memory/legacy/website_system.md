---
name: 官網系統架構與速度優化
description: makesense.site WordPress 多站架構、技術棧、SSH 資訊、速度優化進度
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
> ⚠️ **[LEGACY]** makesense.site（WordPress 舊站）已於 2026/04 確定退役，不再維護。現行主力為 makesense.ink（Next.js 16 + Supabase）。

## 網站架構
- WordPress 多站架構（Hostinger），主網域 makesense.site
- 子網域：bookstore.makesense.site、cultureclub.makesense.site、sense.makesense.site
- 技術棧：WordPress 6.9.4 + Elementor 3.35.9 + WooCommerce + Hello Elementor 主題
- LiteSpeed Cache 7.8.0.1 + QUIC.cloud CDN 已啟用
- Code Snippets 管理所有自訂 CSS/JS（各子站獨立）

## SSH 資訊
- IP: 37.44.245.112, Port: 65002, User: u227862498
- WordPress 路徑：/home/u227862498/domains/makesense.site/public_html/
- Code Snippets 存在 WordPress 資料庫（wp_snippets 表）

## 速度現況（2026-04-02 PageSpeed Insights）

| 指標 | 桌面版 | 手機版 | 目標 |
|------|--------|--------|------|
| Performance 總分 | 54 | 54 | > 80 |
| FCP | 6.4s | 1.3s | < 1.8s |
| LCP | 29.7s | 5.1s | < 2.5s |
| TBT | 200ms | 310ms | < 200ms |
| Speed Index | 7.8s | 2.7s | < 3.4s |
| CLS | 0.006 | 0.047 | < 0.1 |

**最大瓶頸**: LCP 29.7s（桌面）— 首頁輪播大圖（Elementor Slides widget + Swiper）載入極慢

## 已完成的優化（2026-03-31）
- LiteSpeed Cache Advanced 設定 + CDN 啟用 → TTFB 從 4.57s 降到 ~1s
- CSS Minify 開啟
- JS Defer 關閉（會造成宜蘭文化俱樂部連結和大圖閃現問題）
- Object Cache 從 hPanel 開啟

## 待處理事項
- cultureclub 子站的 LiteSpeed Cache 目前關閉，需開回來
- Browser Cache 未開啟（LiteSpeed Cache → [7] Browser）
- Mobile Cache 未開啟（LiteSpeed Cache → [1] Cache）
- 圖片未壓縮/未轉 WebP（LiteSpeed Image Optimization 未啟用）
- 首頁輪播大圖沒有做 lazy load 或 preload
- Code Snippets 有 60+ 個 snippet 全站載入，CSS/JS 很肥
- 特價標籤（WooCommerce sale badge）位置跑掉

## 使用者偏好（速度優化相關）
- 不喜歡一直清快取（LiteSpeed + QUIC.cloud CDN 快取問題很難處理）
- 每次修改都給完整程式碼，不要只給片段

**Why:** 官網是現思文化的主要線上通路，速度直接影響 SEO 和轉換率
**How to apply:** 優化時優先處理 LCP（輪播大圖）和 FCP（CSS/JS 阻塞），避免 JS Defer 造成的視覺閃現問題
