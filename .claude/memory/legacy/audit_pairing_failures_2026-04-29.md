> ⚠️ **[LEGACY]** 2026-04-29 v1 配對失敗稽核，已被 `audit_pairing_failures_2026-04-29_v3.md` 取代。schema 已多輪改名，僅供歷史。

# 配對失敗稽核 — 2026/04/29

範圍：`makesense-ink/` 程式碼 ↔ Supabase project `zgwdomvauuxaxtgqqvrn` ↔ Notion 9 個 DB schema。
排除：AI 欄位（ai_meta、ai企劃、ai_對應 等）、未接 backlog、文件描述問題。

## 🔴 配對失敗（程式 → Notion 不存在的欄位）

DB04 實際 title 為「協作名稱」，無「發佈狀態」、「交接名稱」、「活動類型」、「單價」、「簡介摘要」、「最低數量」。但下列程式仍在讀寫這些欄位：

| 檔案:行 | 問題 |
|---|---|
| `app/api/sync/single/route.ts:237` | DB04 讀 `props["交接名稱"]` (title) — DB04 title 實際為「協作名稱」 |
| `app/api/sync/single/route.ts:238-239` | DB04 讀 `props["活動類型"]` 寫 events.theme/event_type — 欄位不存在 |
| `app/api/sync/single/route.ts:244` | DB04 讀 `props["最低數量"]` 寫 events.min_capacity — 欄位不存在 |
| `app/api/sync/single/route.ts:246` | DB04 讀 `props["簡介摘要"]` 寫 events.description — 欄位不存在 |
| `app/api/sync/single/route.ts:252` | DB04 讀 `props["發佈狀態"]` 決定 events.status — DB04 無此 status 欄位（有「登記發佈」「12.上架發佈」等） |
| `app/api/sync/single/route.ts:233` | DB04 讀 `num(props["單價"])` 作 fallback price — 欄位不存在（有「實際單價」「預計單價」） |
| `app/api/sync/single/route.ts:735` | DB08 寫 topics.cover_url 從 `fileUrl(props["上傳檔案"])` — DB08 無「上傳檔案」file 欄位 |
| `app/api/sync/route.ts:298` | DB08 全量同步 topics.cover_url 同上問題 |
| `app/api/sync/route.ts:486-496` | DB04 全量同步：`交接名稱`、`活動類型`、`單價`、`數量上限`(OK)、`上傳檔案`(OK)、`簡介摘要`、`發佈狀態` — 多個欄位不存在 |
| `scripts/run-sync.mjs:146-156` | DB04 漸進式同步：同樣 `交接名稱`、`活動類型`、`發佈狀態` 不存在 |
| `lib/fetch-bookstore.ts:93,96` | DB04 fetch：`交接名稱`、`活動類型` 不存在 |
| `app/[locale]/buy/[slug]/layout.tsx:64-65` | DB04 預購頁讀 `交接名稱`、`活動日期` — `活動日期` 不存在（有「執行時間」） |
| `scripts/generate-search-index.mjs:47` | 篩 `DB04 property: "活動類型"` — 欄位不存在，filter 必失敗或回空 |
| `scripts/generate-search-index.mjs:61` | DB04 結果讀 `r.properties["交接名稱"]` 與 `r.properties["活動類型"]` — 不存在 |

## ✅ 已驗證沒有問題

- 所有 `supabase.from("X")` 引用的 X 都是 public schema 已存在的表（partners, products, market_applications, vendor_preorders, vendor_preorder_items, line_message_log, page_views, articles, orders, persons, members, staff, partner_performance, reviews, topics, search_logs, encore_requests, order_items, uploads, staff_activities, registrations, vendor_photos, partner_applications, events, wishlist, staff_uploads, space_bookings, translations）。`market_events`/`vendor_products`/`activity_addon_products` 只在 `DATA_LAYER_HANDOFF.md` 出現（規劃文件，非實際程式）。
- DB05、DB06、DB07、DB08 寫入欄位皆驗證對得上 schema（DB07 的「對應作者/對應發行/對應表單/對應標籤」確實存在；DB05 的「表單名稱/表單類型/登記選項/庫存細項/責任執行/對應對象/對應明細」皆存在；DB06 的「明細名稱/明細類型/登記數量/登記單價/登記售價/登記進價/對應庫存/對應表單/明細內容/上傳檔案」皆存在）。
- DB01「專案名稱/執行狀態/提案類型/對應連結/對應提案標籤」、DB02「管考名稱/執行狀態」、DB03「項目名稱/執行狀態/發佈狀態」皆存在。
- Notion select option 比對：`錄取狀態`、`會員狀態`、`經營類型`（觀點/標籤/紀錄）、`關係選項`（個人/合作夥伴/工作團隊）、`商品選項`（選書/選物/數位）、`頁面狀態`（有頁面/無頁面/無狀態）、`發佈狀態`（已發佈/待發佈/無發佈/不發佈/已完成/草稿）、`明細類型`（庫存紀錄等）— 程式比對的字面值都在 schema 對應 select options 中。
- `c4 CLAUDE.md` 自己也誤記「DB04 title 是『交接名稱』」 — 但 schema 顯示為「協作名稱」。這是 CLAUDE.md 也錯（同步文件問題已排除在外）。

## 待確認（不確定就不寫的項目）

無。
