# makesense.ink — 現思文化創藝術官網

## 專案概述
Next.js 16 + Tailwind CSS 4 + TypeScript 商業網站，部署在 Vercel，CMS 用 Notion API。
專案擁有者：Noah（Jay049）— 現思文化創藝術有限公司 L5 執行長

## 技術棧
- Next.js 16.2.3 (App Router, Turbopack)
- Tailwind CSS 4
- TypeScript
- @notionhq/client (Notion SDK)
- @supabase/supabase-js + @supabase/ssr
- next-auth (NextAuth — Google + LINE OAuth)
- 部署：Vercel
- 資料庫：Supabase（PostgreSQL）
- 金流：到門市現場付現（線上金流尚未串接）

## 網站結構（2026/04/13 更新）
```
/                        → 品牌首頁（Hero + 統計 + 雙品牌 + 近期活動，全動態）
/sense                   → 關於我們
/bookstore               → 旅人書店（主題選書、風格選物、策展）
/book-selection          → 主題選書專頁
/goods-selection         → 風格選物專頁
/cultureclub             → 宜蘭文化俱樂部（活動、通訊、觀點、選書選物、行事曆）
/market-booking          → 展售合作（自有產品、地方特色產品展售、市集活動）
/reading-tour            → 走讀漫遊（走讀旅行關鍵字、去過的地方）
/space-experience        → 空間體驗（空間租借行事曆）
/content-curation        → 地方調研（統計、採輯主題）
/local-newsletter        → 地方通訊完整存檔
/viewpoint-stroll        → 文化觀點列表
/viewpoint/[slug]        → 單一觀點詳情
/product/[slug]          → 商品詳情
/post/[slug]             → 文章詳情
/events/[slug]           → 活動詳情
/buy/[slug]              → 市集預購頁（無 Header/Footer）

/dashboard               → 會員中心（一般會員：參與分析、購買紀錄）
/dashboard/workbench     → 工作台（工作團隊限定）
/dashboard/partner       → 合作後台（合作夥伴限定）
/dashboard/profile       → 個人資料
/dashboard/orders        → 訂單紀錄
/dashboard/products      → 商品管理（合作夥伴限定）
/dashboard/proposals     → 提案管理（合作夥伴限定）

/telegram/workbench      → Telegram 工作台（無 Header/Footer）

/login                   → 登入
/checkout                → 結帳（已接 Supabase）
/checkout/success        → 結帳成功
/privacy                 → 隱私政策
/terms                   → 服務條款
```

### 已刪除的頁面（2026/04/13）
- /activity/[slug] — 與 /events/[slug] 重複
- /space-booking — 已拆為 /reading-tour + /space-experience
- /tour-booking — 整合到 /reading-tour
- /local-school — 佔位頁面，未來需要時重建
- /dashboard/volunteer — 等會員等級系統再重建
- /dashboard/yilan-map — 等會員等級系統再重建

## 三種會員角色
- **一般會員**：看到 /dashboard（個人紀錄）
- **工作團隊**（staff）：多一個「工作台」分頁 /dashboard/workbench
- **合作夥伴**（vendor）：多一個「協作平台」分頁 /dashboard/partner
- 角色判斷：dev 環境用左側 DevRole 切換，正式環境從 Notion DB08「對象選項」欄位判斷

## 三種入口環境
| 入口 | 路由方式 | 認證 | Header/Footer |
|------|---------|------|--------------|
| 官網瀏覽器 | 正常路由 | NextAuth | 顯示 |
| LINE LIFF | 共用路由 | LIFF SDK 靜默登入 | 隱藏，加懸浮按鈕 |
| Telegram Mini App | /telegram/* | initData HMAC | 隱藏 |

Layout 判斷在 components/ui/LayoutShell.tsx，`/telegram` 和 `/buy` 路徑不顯示 Header/Footer。
訂單來源用 orders.source 區分：web / liff / telegram / preorder。

## Footer 連結順序
關於我們 | 展售合作 | 走讀漫遊 | 空間體驗 | 地方調研 | [FB icon] [IG icon] [Email icon] 039-325957 宜蘭縣羅東鎮文化街55號

## 各頁面「前往更多」連結
- 旅人書店「主題選書」→ /book-selection
- 旅人書店「風格選物」→ /goods-selection
- 俱樂部「地方通訊」→ /content-curation
- 俱樂部「話題觀點」→ /viewpoint-stroll
- 俱樂部「選書選物」→ /bookstore

## 工作台（/dashboard/workbench）
| Tab | 功能 | 資料來源 |
|-----|------|---------|
| 📢 動態 | 庫存異動、系統通知 | DB07 |
| 📋 交接 | 待辦事項 + 子任務 checklist | DB03 + DB06 |
| 📦 庫存 | 商品出貨/進貨/盤點 | DB07 |
| ⏰ 考勤 | 打卡/日誌/請假/加班/班表 | DB05 |
| 💰 費用 | 請款 + 請購 | DB06 |
- 組件抽到 components/workbench/WorkbenchShell.tsx，官網和 Telegram 共用
- 工作台直接走 Notion API，不經 Supabase
- Tab Bar 用 sticky 定位（不是 fixed）
- 分頁標籤：「個人紀錄」|「工作台」

## 合作後台（/dashboard/partner）
5 個 Tab：📊 概覽 | 🏪 資訊 | 📦 項目 | 💰 金流 | ⚙️ 設定
- 掃碼簽到功能（待加入）
- 近期顧客評價（從 Supabase reviews 讀取）

## 結帳頁面（/checkout）
- 付款方式：到門市現場付現
- 報名資訊可編輯，多人用分頁切換
- 取貨姓名/電話 placeholder 預設跟聯絡人一樣
- 同意條款在右欄結帳按鈕上方
- 結帳呼叫 /api/checkout → 寫入 Supabase orders + order_items + registrations

## 行事曆（Calendar 元件）
- 路徑：components/calendar/Calendar.tsx
- 格高：default=110px, space=120px, market=90px（手機版自動縮小）
- 自動載入台灣國定假日（含農曆，from TaiwanCalendar API）
- mode="default"：顯示活動名稱 + 受理狀態，可點進文章
- mode="space"：每天分上午/下午，顯示「可預約」或「已預訂」
- fetchUrl prop：元件自動載入月份資料（/api/calendar/events 或 /api/calendar/bookings）

## 展售合作（/market-booking）
- 文案寬度：1200px
- 自有產品：名稱在圖片內，不顯示價格
- 地方特色產品展售：from DB08 觀點
- 市集活動狀態自動計算（已結束/截止報名/報名中）

## 市集預購（/buy/[slug]）
- 無 Header/Footer（LayoutShell 判斷）
- 純表單紀錄，不扣庫存（庫存是廠商自己管的）
- 預購訂單 source='preorder'
- 廠商商品資料來自 DB05（報名表頭）+ DB06（展售商品明細）
- 審核通過後才開放預購

## Supabase 資料庫
- 專案 ID：zgwdomvauuxaxtgqqvrn
- URL：https://zgwdomvauuxaxtgqqvrn.supabase.co
- 主要表：members, orders, order_items, registrations, reviews, products, events, articles, persons, topics, partners, staff, places, space_bookings, uploads, page_views, search_logs, wishlist, partner_applications, partner_performance, staff_activities, staff_uploads
- orders.checkin_status：pending(未簽到) / in_progress(進行中) / checked_in(已簽到)

## Notion 資料庫
| DB | 名稱 | 對應 Supabase 表 |
|----|------|-----------------|
| DB01 | 資源提案 | 不同步（內部管理） |
| DB02 | 績效管考 | 不同步（內部管理） |
| DB03 | 工作項目進度 | 工作台直接 Notion API |
| DB04 | 共識交接協作 | events, space_bookings |
| DB05 | 登記表單明細 | articles, registrations, orders |
| DB06 | 進銷明細 | order_items |
| DB07 | 庫存資產 | products |
| DB08 | 關係經營 | persons, partners, members, staff, topics |
| DB09 | 範圍日期 | 不同步（SQL 聚合即可） |

### 重要欄位名稱
- DB05 的 title 欄位叫「表單名稱」（不是「明細名稱」）
- DB08 的 title 欄位叫「經營名稱」
- DB05 的 relation 欄位叫「對應標籤對象」（不是「對應對象標籤」）

## Notion ↔ Supabase 同步
- 狀態：**已建好同步 API，已完成首次同步（706 筆資料）**
- 同步 API：POST /api/sync（手動觸發全量同步）
  - 加 ?writeback=true 會回寫 Notion（發佈狀態=已發佈 + 對應連結=官網URL）
  - 不加參數只同步不回寫（較快）
- 同步順序：DB08→persons/topics/partners/members/staff → DB07→products → DB04→events → DB05→articles
- 每張表用 notion_id 做 upsert key
- Notion API 自動分頁（page_size=100 + cursor），已支援超過 100 筆
- 批次 upsert（每 200 筆一批），避免 Supabase 限流
- Notion API 502/504/429 自動重試最多 3 次
- 支援 ?tables=events,articles 分段同步
- 獨立漸進式同步腳本：scripts/run-sync.mjs（邊查邊存，Notion 不穩也不怕丟資料）
- 圖片代理 API：/api/notion-image?pageId=xxx — 解決 Notion 內部檔案 URL 1 小時過期問題
- 文章正文同步 API：/api/sync/content?table=articles — 批次抓 Notion blocks→HTML 存入 Supabase
- 圖片遷移 API：/api/sync/images?table=events — 批次遷移 Notion 圖片到 Cloudinary CDN
- n8n Daily sync：每天 8AM 自動全量同步（workflow ID: C8Tc2zIoSW4THUr2，已啟用）
- 前端 fallback：/post/[slug] 先讀 Supabase content，沒有才即時查 Notion API 並自動回存
- 同步方向：Notion 提供內容 → Supabase；Supabase 提供交易數據 → Notion
- 行為資料（page_views, search_logs, wishlist, reviews）留 Supabase 不回寫 Notion
- 定期聚合報表寫入 DB05

## 前端資料來源切換進度（2026/04/13 全部完成）
已從 Supabase 讀取真實資料的頁面：
- ✅ /bookstore — fetchSBProducts, fetchSBArticles（B5 改為「地方通訊」，只顯示文章不顯示活動）
- ✅ /cultureclub — fetchSBEvents, fetchSBArticles, fetchSBTopics, fetchSBProducts
- ✅ /checkout — 結帳寫入 Supabase orders + order_items
- ✅ /dashboard — 購買紀錄從 Supabase 讀取（有 mock fallback）
- ✅ /market-booking — fetchSBProducts, fetchSBPartners, fetchSBAllEvents
- ✅ /content-curation — fetchSBArticles, fetchSBTopics, fetchSBPersons
- ✅ /reading-tour — fetchSBTopics, fetchSBPersons（拆 server + client component）
- ✅ /events/[slug] — supabase.from("events") 用 notion_id/id 查詢
- ✅ /goods-selection — supabase.from("products") 直接查詢
- ✅ /book-selection — supabase.from("products") 篩選選書類（原本用 mock data）
- ✅ /local-newsletter — fetchSBArticles(100)（原本用硬編碼假文章）
- ✅ /dashboard/partner — supabase partners + products + partner_performance + reviews
- ✅ /dashboard/products — supabase partners + products（移除 dev mock fallback）

已無 mock data 的頁面（2026/04/14 全部完成）：
- ✅ / (首頁) — 近期活動 + 統計數字從 Supabase 即時讀取
- ✅ /bookstore — Hero 輪播從 Supabase events + articles 動態生成
- ✅ /cultureclub — 所有區塊從 Supabase 動態讀取（含地方通訊 tags）
- ✅ /post/[slug] — Supabase content 優先，fallback Notion API + 自動回存
- ✅ /checkout — 移除 DEMO_ITEMS，空車時顯示空車
- ✅ /product/[slug] — Supabase products 查詢 + 加入購物車功能
- ✅ /events/[slug] — Supabase events 查詢 + 票券選擇器 + 加入購物車
- ✅ /viewpoint/[slug] — Supabase topics 查詢
- ✅ RecommendSections — 從 Supabase articles + products 動態讀取
- ✅ Header — 購物車圖示 + 數量 badge
- ✅ 搜尋 — 即時查 Supabase API（debounce 300ms）
- ⚠️ /bookstore ViewpointExplorer — 地圖座標寫死（視覺 UI，非資料問題）
- DevRoleProvider — MOCK_PROFILES（dev 角色切換，不需改）

### 狀態映射規則（2026/04/14 統一）
- Notion「待發佈」→ Supabase `active`/`published`（待發佈 = 準備好可顯示）
- Notion「無發佈」→ Supabase `draft`/`inactive`（無發佈 = 不顯示）
- Notion「已發佈」→ Supabase `active`/`published`
- Notion「不發佈」→ Supabase `inactive`

### Supabase 新增欄位（2026/04/14）
- products: `sub_category`（商品選項）、`supplier_type`（進貨屬性）
- topics: `region`（觀點區域 multi_select → text[]）、`content`（頁面正文 HTML）、`parent_id`（自對關係）
- articles: `content`（文章正文 HTML，由 /api/sync/content 或前端 fallback 寫入）

### B5 地方通訊變更（2026/04/13）
- 書店首頁 B5 從「最新消息」改為「地方通訊」，只顯示文章，不顯示活動
- B5 和 C3 都是 articles，只是呈現方式不同
- 「前往更多」連結：B5→/local-newsletter、C3→/local-newsletter
- /local-newsletter 是地方通訊完整存檔頁
- /book-selection 是主題選書獨立列表頁（B2「前往更多」的目標）

統一的 Supabase 查詢函式庫：lib/fetch-supabase.ts
- fetchSBProducts(subCategory?, limit) — 商品（全部 active）
- fetchSBOwnProducts(limit) — 自營產品（publisher_id 為旅人書店/現思文化/宜蘭文化俱樂部）
- fetchSBEvents(limit) — 未來活動
- fetchSBAllEvents(limit) — 所有活動
- fetchSBArticles(limit) — 已發佈文章
- fetchSBTopics(tagType?, limit) — 觀點/標籤
- fetchSBPartners(limit) — 合作夥伴
- fetchSBPersons(type?, limit) — 人物

### MK0 自營產品定義（2026/04/13 更新）
- 定義方式：由「對應發行」（publisher_id）判斷，不再用「進貨屬性」
- 自家品牌：旅人書店、現思文化創藝術有限公司、宜蘭文化俱樂部
- Notion view 篩選：`庫存類型=商品 AND 對應發行 relation_contains 三家品牌`
- Supabase 查詢：`fetchSBOwnProducts()` → `WHERE publisher_id IN (三家品牌 persons.id) AND status='active'`

### 單筆即時同步機制（2026/04/13 建立）
- Notion「發佈更新」button → n8n webhook → POST /api/sync/single → Supabase
- 所有 DB 統一用「發佈狀態」欄位判斷同步後的 status
- n8n webhook URLs：
  - DB04: https://makesense.zeabur.app/webhook/sync-db04
  - DB05: https://makesense.zeabur.app/webhook/sync-db05
  - DB06: https://makesense.zeabur.app/webhook/sync-db06
  - DB07: https://makesense.zeabur.app/webhook/sync-db07
  - DB08: https://makesense.zeabur.app/webhook/sync-db08

## 交接文件
- TELEGRAM_SYNC_HANDOFF.md — Telegram Bot 同步交接
- MEMBER_SESSION_HANDOFF.md — 會員中心 session 交接
- DATA_LAYER_HANDOFF.md — 資料層整合交接（合作後台 session）
- Notion 官網維護指南：https://www.notion.so/049/32c9ff25fdab81389368eac6f77bc417

## 設計規範
- 品牌色：棕 #7a5c40、棕褐 #b89e7a、米 #faf8f4、青 #4ECDC4、橘 #e8935a
- 字體：Noto Sans TC（內文）、Noto Serif TC（標題）、Playfair Display（品牌）
- 頁面最大寬度：1200px
- 文案區塊寬度：1000px（走讀漫遊、空間體驗、地方調研）或 1200px（展售合作）
- 行事曆最大寬度：1000px

## 開發指令
```bash
npm run dev    # 本地開發（Turbopack）
npm run build  # 建置
npm run start  # 生產模式
npm run lint   # ESLint
```

## 注意事項
- Turbopack 快取損壞時 `rm -rf .next && npm run dev` 重啟
- 完整重裝 `rm -rf .next node_modules package-lock.json && npm install && npm run dev`
- 非英文路徑偶爾導致 Turbopack panic，重裝 node_modules 可解決
- 舊站 makesense.site 已退役，不再維護
