---
name: makesense.ink Supabase 遷移完成
description: 2026/04/13 全站從 mock data 遷移到 Supabase 完成，含同步機制建立
type: project
---

## 2026/04/13 完成事項

### 前端頁面全部改用 Supabase
所有官網頁面已從 mock data 改接 Supabase 真實資料，包含：
/bookstore, /cultureclub, /market-booking, /content-curation, /reading-tour,
/events/[slug], /goods-selection, /book-selection, /local-newsletter,
/viewpoint-stroll, /product/[slug], /viewpoint/[slug],
/dashboard, /dashboard/partner, /dashboard/products, /buy/[slug]

mock-data.ts 精簡到只剩 MOCK_PROFILES（dev 角色切換用）。

### 單筆即時同步機制
- POST /api/sync/single?pageId=xxx&db=DB07 — 單筆同步 API
- n8n webhook workflows 已建好並啟用（DB04~DB08 各一個）
- Notion「發佈更新」button → n8n webhook → /api/sync/single → Supabase
- 失敗時發 Telegram 通知

**Why:** 不用每天定時全量同步，只有 Notion 按下發佈更新才同步，避免不該上線的資料被推到官網。

**How to apply:** 所有 DB 統一用「發佈狀態」欄位判斷 Supabase 的 status。

### Webhook URLs
- DB04: https://makesense.zeabur.app/webhook/sync-db04 → events
- DB05: https://makesense.zeabur.app/webhook/sync-db05 → articles
- DB06: https://makesense.zeabur.app/webhook/sync-db06 → order_items（待完善）
- DB07: https://makesense.zeabur.app/webhook/sync-db07 → products
- DB08: https://makesense.zeabur.app/webhook/sync-db08 → persons/topics/partners/staff

### 其他完成項
- Notion queryDatabase 加了分頁（persons 從 100→259 筆）
- events 表擴充 location, guide, event_type, route_stops, tickets, addons, keywords
- MK0 自營產品改用 publisher_id 篩選（旅人書店/現思文化/宜蘭文化俱樂部）
- B5 從「最新消息」改為「地方通訊」（只顯示文章）
- /bookstore/market-booking 廢棄刪除
- B4 主題策展改動態 fetchSBTopics("viewpoint")
- 每日定時同步仍啟用中（n8n workflow C8Tc2zIoSW4THUr2, active=true, 每天 8AM），與即時同步並行運作
