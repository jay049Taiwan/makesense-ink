---
name: 全站行事曆通用規格
description: CAL-CORE snippet 規格、各頁面資料來源對應、WP snippet ID、API 限制備忘
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
> ⚠️ **[LEGACY]** 本文件描述 WordPress 舊站 makesense.site 的 Snippet 規格。makesense.site 已於 2026/04 確定退役，不再維護。新站 makesense.ink（Next.js 16 + Supabase）行事曆由 React 元件處理，與本規格無關。

## Snippet 資訊
- **Snippet ID**: 138（CAL-CORE | 全站行事曆通用格式）
- **Scope**: global, priority 30
- **原始碼備份**: `/tmp/cal_merged.php`
- **舊 snippet 131/132/133 已刪除**（2026-04-01）

## 通用規格（三頁共用）
- 寬度：940px
- 週一起始（一二三四五六日）
- 格子高度：90px，邊框 `#f0f0f0`
- 導航列：左=標題（年月），右=按鈕組（上月/本月/下月）
- 週六/日：背景 `#fdf8f7`/`#fdf6f5`，文字 `#c87060`
- 國定假日：背景 `#f4fbf4`，文字 `#2e7d32`
- 今天：背景 `#f0fffe`
- 國定假日自動更新：WP Cron 每日從台灣政府 API 抓取，存 `wp_options`

## 各頁面資料來源
| 頁面 | URL | WP Page ID | 行事曆 selector | 資料來源 |
|------|-----|------------|-----------------|----------|
| 旅人書店首頁 | `bookstore.makesense.site/` | 38 | `.event-calendar-grid` | DB04 活動資訊 |
| 展售合作 | `bookstore.makesense.site/market-booking/` | 3091 | `#ms-cal-body` | DB04 活動資訊 → 市集活動 |
| 空間體驗 | `bookstore.makesense.site/space-booking/` | 3092 | `#ms-bk2-grid` | DB06 數位類型 → 票券產品 → 空間類型 |

## Code Snippets API 注意
- POST 建立新 snippet：正常運作，`active: true` 在 POST 時有效
- PUT 更新 snippet：回傳 200 但 **code 和 active 變更不持久**，僅 desc/meta 可改
- DELETE：正常運作
- 要修改 code：刪掉重建（DELETE + POST）
- 部署後需清 LiteSpeed 快取：`POST /wp-json/wp/v2/pages/{id}` 帶空 content

## 台灣國定假日 API
- URL: `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/{year}.json`
- 過濾：`isHoliday: true` 且 `description` 不是「星期六」或「星期日」
- 日期格式：`YYYYMMDD` → 轉 `YYYY-MM-DD`
