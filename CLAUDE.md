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
- 角色判斷：dev 環境用左側 DevRole 切換，正式環境從 Notion DB08「會員狀態=會員」+「關係選項」欄位判斷

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

## Footer 四頁面上下半部架構
Footer 連結的四個主要頁面，每個頁面分上半部和下半部：

### 上半部：DB05 官網備項（編輯性內容）
從 DB05「登記內容」撈取，篩選條件：`文案選項=官網內容`，再用「官網備項」欄位對應到各頁面：
| 頁面 | 路由 | DB05 官網備項值 |
|------|------|----------------|
| 關於我們 | /sense | 關於我們（footer) |
| 展售合作 | /market-booking | 展售合作（footer) |
| 空間體驗 | /space-experience | 空間體驗（footer) |
| 內容採輯 | /content-curation | 內容採輯（footer) |

頁面正文（Notion blocks）直接渲染為官網上半部內容。

### 下半部：Supabase 動態資料（各頁面不同展示邏輯）
| 頁面 | 下半部區塊 |
|------|----------|
| 關於我們 /sense | 時間軸、核心能力、營運效益 |
| 展售合作 /market-booking | 自製商品、展售品牌、活動招商 |
| 空間體驗 /space-experience | 空間體驗、走讀路線 |
| 內容採輯 /content-curation | 關鍵字 |

Notion「官網發佈紀錄」頁面的「區塊」view 可查看所有帶官網備項標籤的 DB05 頁面。

## 各頁面「前往更多」連結
- 旅人書店「主題選書」→ /book-selection
- 旅人書店「風格選物」→ /goods-selection
- 俱樂部「地方通訊」→ /content-curation
- 俱樂部「話題觀點」→ /viewpoint-stroll
- 俱樂部「選書選物」→ /bookstore

## 工作台（兩個入口共用同一個 UI）

⚠️ **鐵律：工作台 UI 一律改 `components/workbench/WorkbenchShell.tsx`**
- 不要在 page.tsx 內複製 / fork 組件
- 不要為 Telegram 端另寫一份 UI
- 新增 Tab、改順序、調子面板都改 WorkbenchShell.tsx，兩邊自動同步

### 兩個入口
| 路徑 | 角色判斷 | 認證方式 | Header/Footer |
|------|---------|---------|--------------|
| `/dashboard/workbench` | session.role === "staff"（NextAuth）| Google/LINE OAuth | 顯示 |
| `/telegram/workbench` | member_type === "staff"（Supabase）| Telegram WebApp initData HMAC | 隱藏（LayoutShell） |

兩邊都 `import WorkbenchShell from "@/components/workbench/WorkbenchShell"`。

### 五個 Tab
| Tab | 功能 | 資料來源 |
|-----|------|---------|
| 📢 動態 | 庫存異動、系統通知 | DB07 |
| 📋 交接 | 待辦事項 + 子任務 checklist | DB03 + DB06 |
| 📦 庫存 | 商品出貨/進貨/盤點 | DB07 |
| 📓 紀錄 | 打卡/日誌/請假/加班 | DB05（紀錄細項）+ Supabase staff_activities（讀取走 Supabase）|
| 💰 費用 | 請款 + 請購 | DB05（請款請購）|

- 工作台直接走 Notion API，不經 Supabase
- Tab Bar 用 sticky 定位（不是 fixed）
- 官網端分頁標籤：「個人紀錄」|「工作台」（Telegram 端無此標籤）
- Telegram auth API：`/api/telegram/auth`（HMAC 驗 initData → 查 Supabase members.telegram_uid）

## 合作後台（/dashboard/partner）
5 個 Tab：📊 概覽 | 🏪 資訊 | 📦 項目 | 💰 金流 | ⚙️ 設定
- **概覽統計**：查 `partner_metrics_v` VIEW，用 `session.notionId`（DB08 notion_id）直接 match，不再走 partner_performance 兩步查詢
- **QrScanModal**（`components/partner/QrScanModal.tsx`）：掃描顧客 QR Code → 三步驟 Supabase 驗證 → orders 確認存在 → order_items 取商品清單 → products.publisher_notion_id 比對 notionId → 確認取貨時 UPDATE orders.checkin_status = 'checked_in'
- **取貨 QR Code**：結帳成功頁（/checkout/success）+ 訂單詳情頁（/dashboard/orders/[id]）均顯示 QRCodeSVG（qrcode.react），value = orderId（UUID）；checked_in 時 QR Code 半透明 + 覆蓋「✅ 已取貨」badge
- **VendorSettings**：從 `partners` 表動態讀取 name / contact（JSONB）/ created_at，不再寫死假資料
- 近期顧客評價（從 Supabase reviews 讀取）
- **partner session notionId**：`session.notionId` = DB08 page ID（32 碼無 dash），用於所有廠商識別查詢

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
- 主要表：members, orders, order_items, registrations, reviews, products, events, articles, persons, topics, partners, staff, space_bookings, uploads, page_views, search_logs, wishlist, partner_applications, partner_performance, staff_activities, staff_uploads, social_metrics, translations, line_message_log, encore_requests, vendor_preorders, vendor_preorder_items, workbench_notifications
- 補充說明：market_applications, point_ledger, vendor_photos（詳見補充更新區）
- VIEW：partner_metrics_v, point_balance（詳見補充更新區）
- orders.checkin_status：pending(未簽到) / in_progress(進行中) / checked_in(已簽到)
- encore_requests：敲碗再辦請求（event_slug, event_title, name, email, phone, member_id）
- vendor_preorders：市集預購訂單（vendor_db05_notion_id, market_db04_notion_id, status）+ vendor_preorder_items（明細）
- workbench_notifications：工作台動態通知（source_db, notion_id, event_type, event_at, title, metadata jsonb）

## Notion 資料庫
| DB | 名稱 | 對應 Supabase 表 |
|----|------|-----------------|
| DB01 | 資源提案 | 不同步（內部管理） |
| DB02 | 績效管考 | 不同步（內部管理） |
| DB03 | 項目進度 | 工作台直接 Notion API |
| DB04 | 協作交接 | events, space_bookings |
| DB05 | 登記內容 | articles（篩選：文案選項=官網內容）, registrations, orders；**X引用 + X被引 共 18 個 relation 不參與同步** |
| DB06 | 清單明細 | **直接更新 products.stock**（進貨+/出貨-/盤點=） |
| DB07 | 庫存控管 | products（名稱/價格/照片/作者/發行/觀點/文章） |
| DB08 | 關係對象 | persons, partners, members, staff, topics |
| DB09 | 日期紀錄 | 不同步（SQL 聚合即可） |

### 重要欄位名稱
- DB04 的 title 欄位叫「協作名稱」，但**官網顯示標題用「主題名稱」（rich_text）**
- DB05 的 title 欄位叫「內容名稱」，但**官網顯示標題用「主題名稱」（rich_text）**
- DB05 內容類型 select 三個選項：報名登記 / 共識互動 / **內容素材**（2026/05/06 改名，舊名「圖文影音」）
- DB08 的 title 欄位叫「對象名稱」
- DB05 連 DB08：「對應對象」relation
- DB06 連 DB08：「對應標籤對象」relation
- 同步優先級:主題名稱 > title 欄位（協作名稱/內容名稱）→ Supabase .title

### DB05 三層 relation 設計（2026/05/06 雙層 → 2026/05/08 升級三層）
- **對應X**（9 個 + ai_對應X）= 直接上下游 → partner_metrics_v 等聚合查詢只看這個
- **X引用**（9 個）= 引用提及，出向（此 page 主動引用他人）→ **不參與 Supabase 同步**、不入聚合
  - 提案引用 / 管考引用 / 項目引用 / 協作引用 / 內容引用 / 明細引用 / 庫存引用 / 對象引用 / 日期引用
- **X被引**（9 個）= 此 page 被他人引用，入向 → **AI 廣泛寫入為主**，人工清掉不適合的；**不**走 Notion auto dual sync；不參與 Supabase 同步、不入聚合
  - 提案被引 / 管考被引 / 項目被引 / 協作被引 / 內容被引 / 明細被引 / 庫存被引 / 對象被引 / 日期被引
- sync route 自動忽略 X引用 + X被引 共 18 個 relation
- 全文搜尋（articles_search_v）三條都看

### DB04 重要欄位（2026/05/04 schema 校正）
- title：**協作名稱**
- 主題名稱（rich_text）：官網顯示用
- **協作類別**（select，2 項）：活動辦理 / 內容製作（**舊名「協作選項」已改名**）
- 交接類型（select）：專案協作 / 庫存門市
- **門市類別**（select，4 項）：盤點檢查 / 使用場地 / 保養維護 / 值班顧店（**舊名「門市選項」已改名**；場地租借同步條件 = 使用場地）
- **活動選項**（select，10 項）：工坊手作/陳列展售/數位活動/典禮儀式/文化冊展/講座課程/園遊市集/導覽走讀/藝文表演/其他 — 對應 events.event_type / theme（**舊名「活動細項」已改名**；走讀行旅 → 導覽走讀）
- **實際總價**（formula）→ events.price（**舊欄位「實際單價」「預計單價」已刪除**）
- 數量上限 / 最低數量（number）→ events.capacity / min_capacity
- 距離km（number，無括號）→ events.distance_km
- 簡介摘要（rich_text）→ events.description
- **發佈狀態**（status：待發佈/已發佈/不發佈）→ events.status（**舊欄位「登記發佈」已撤回**，現在跟其他 DB 統一叫「發佈狀態」）
- **交接回覆**（text）：交接備註與回覆統一用此欄（**舊欄位「交接備註」已刪除**）
- 對應辦理單位（relation→DB08）：承辦廠商
- 對應對象（relation→DB08）：講師/帶路人

### DB08 同步篩選規則
DB08「經營類型」select：**觀點 / 標籤 / 紀錄**

| Supabase 表 | DB08 過濾條件 |
|-------------|--------------|
| topics | 經營類型 IN (觀點, 標籤)；觀點→tag_type='viewpoint', 標籤→'tag' |
| persons | 會員狀態=會員 AND 關係選項=個人 |
| partners | 會員狀態=會員 AND 關係選項=合作夥伴 |
| staff | 會員狀態=會員 AND 關係選項=工作團隊 |
| members | 會員狀態=會員（不論關係選項，以 email 為主鍵） |

**同一筆 DB08 可同時寫入多表**（例：帶路老師「經營類型=觀點 + 關係選項=個人」會同時出現在 topics 和 persons）

### 其他欄位
- 行政區域（select；DB08）
- 單價（number；DB04 活動）
- 庫存異動規則：DB05 內容類型=報名登記 + 登記類別=紀錄庫存 + 庫存細項=進/出/盤 → DB06（明細類型=庫存紀錄）→ DB07

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

### 發佈/下架流程（2026/04/15 更新）

**上架流程：**
1. 在 Notion 將「發佈狀態」設為 **「待發佈」**
2. 按 **「發佈更新」** 按鈕
3. n8n webhook → /api/sync/single → Supabase upsert（status = active）
4. 自動回寫 Notion：「發佈狀態」→「已發佈」+「對應連結」→ URL
5. 官網顯示該筆資料

**更新流程：**
1. 修改 Notion 內容（此時「發佈狀態」已是「已發佈」）
2. 按 **「發佈更新」** 按鈕
3. Supabase 更新內容（status 維持 active）

**下架流程：**
1. 在 Notion 將「發佈狀態」改為 **「無發佈」**
2. 按 **「發佈更新」** 按鈕
3. Supabase status 改為 draft（官網不再顯示）
4. 自動回寫 Notion：「發佈狀態」→「待發佈」（方便下次重新上架）

**狀態映射表：**
| Notion 發佈狀態 | Supabase status | 官網顯示 | 回寫 Notion |
|---|---|---|---|
| 待發佈 | active/published | 顯示 | → 已發佈 + URL |
| 已發佈 | active/published | 顯示 | 更新內容 |
| 無發佈 | draft | 不顯示 | → 待發佈 |
| 不發佈 | draft | 不顯示 | → 待發佈 |
| 空值（未設定） | 不同步 | — | — |

### Supabase 新增欄位
- products: `sub_category`（商品選項）、`supplier_type`（進貨屬性）、`related_topic_ids`（jsonb，對應標籤→topics）、`related_article_ids`（jsonb，對應表單→articles）
- topics: `region`（行政區域 multi_select → text[]）、`content`（頁面正文 HTML）、`parent_id`（自對關係）
- articles: `content`（文章正文 HTML，由 /api/sync/content 或前端 fallback 寫入）
- translations: 多語言翻譯表（table_name + row_id + locale + field）
- line_message_log: LINE 推播紀錄

### 商品資料來源分工（2026/04/15）
| 資料 | 來源 | 觸發方式 |
|------|------|---------|
| 庫存數量 | DB06 清單明細 | DB06 按「發佈更新」→ 即時加減 stock |
| 商品名稱/ID/價格/簡介/照片/分類 | DB07 庫存控管 | DB07 按「發佈更新」→ 同步全部欄位 |
| 作者/發行商 | DB07 對應作者/對應發行 → DB08 | DB07 同步時自動反查 |
| 相關觀點 | DB07 對應標籤 → DB08 topics | DB07 同步時存入 related_topic_ids |
| 對應文章 | DB07 對應表單 → DB05 articles | DB07 同步時存入 related_article_ids |

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

### 商品顯示規則（2026/04/15 更新）

**庫存顯示邏輯：**
| 條件 | 主題選書/風格選物/推薦區 | 搜尋結果 | 文化觀點 | 商品單頁 |
|------|----------------------|---------|---------|---------|
| 已發佈 + 庫存 > 0 | ✅ 主動顯示 | ✅ 可搜尋 | ✅ 顯示 | 正常購買 |
| 已發佈 + 庫存 = 0 | ❌ 不顯示 | ✅ 可搜尋 | ✅ 顯示 | 顯示「無庫存」紅色色塊 |
| 待發佈/草稿 | ❌ | ❌ | ❌ | ❌ |

**商品選項分類（2026/04/22 更新，縮減為 3 種）：**
DB07「商品選項」（sub_category）只有 3 個選項：**選書、選物、數位**

| 分類 | 對應細項欄位 | 細項選項 | 官網公開頁面 |
|------|------------|---------|-----------|
| 選書 | 選書細項 | （依書籍類型細分）| 顯示（需有庫存） |
| 選物 | 選物細項 | （依商品類型細分）| 顯示（需有庫存） |
| 數位 | 數位細項 | 內容 / 貼圖 / 票券 | 顯示（需有庫存） |

**票券放置**：商品選項=數位 AND 數位細項=票券

- 列表查詢加 `.gt("stock", 0)`：fetchSBProducts、fetchSBOwnProducts、book-selection、goods-selection、MightAlsoLike
- 搜尋 API **不** 過濾庫存（所有已發佈都可搜尋）
- 商品單頁 **不** 過濾庫存（用 notion_id 直接查，庫存 0 顯示紅色「無庫存」色塊）

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

## SEO & 基礎設施（2026/04/14 建立）
- `app/robots.ts` — 搜尋引擎爬蟲規則（Disallow: /api/, /dashboard/, /telegram/, /checkout, /buy/, /login）
- `app/sitemap.ts` — 動態 sitemap（靜態頁 + Supabase 動態內容）
- `app/manifest.ts` — PWA manifest（standalone 模式，品牌色）
- `app/feed.xml/route.ts` — RSS Feed（文章 + 活動，自動從 Supabase 生成）
- `app/not-found.tsx` — 自訂 404 頁面
- `app/error.tsx` — 錯誤邊界（重新載入 + 回首頁）
- Loading 骨架屏：首頁、dashboard、文章、活動、商品、觀點 detail 頁
- JSON-LD 結構化資料：Organization（全域）、Event（活動詳情）、Product（商品詳情）
- 全域 OG/Twitter tags + canonical URL（layout.tsx）
- RSS 自動發現標籤（layout.tsx `<head>`）

## LINE LIFF 整合（2026/04/14 建立）
- **模擬器**：`/dev/line-simulator` — LINE 聊天室模擬器，iframe 載入真實頁面帶 `?liff_mode=true`
- **LIFF 模式偵測**：`LayoutShell.tsx` 讀 URL 參數 `?liff_mode=true` → 隱藏 Header/Footer
- **Rich Menu 六宮格**（2026/04/15 重新設計，LIFF 原生體驗）：
  ```
  📚 選書選物 → /liff/shop       | 🎪 活動體驗 → /liff/events      | 🗺️ 觀點漫遊 → /liff/viewpoints
  🛒 確認結帳 → /checkout        | 📮 地方通訊 → /liff/newsletter   | 👤 會員中心 → /liff/member
  ```
  - /liff/shop：搜尋 + 條碼掃描（html5-qrcode）+ 商品推薦
  - /liff/events：未來活動卡片列表（過期不顯示）
  - /liff/viewpoints：GPS 定位 → 鄉鎮篩選 → 觀點列表
  - /liff/newsletter：最近 20 則文章 + 底部「查看全部」連結
  - /liff/member：會員資訊 + LINE 綁定 + 快捷連結
- **來源切換器**：LINE LIFF / Google 地圖 / Facebook / QR Code / 官網正常
- **購物車持久化**：localStorage（跨 Rich Menu 切換不會清空）+ postMessage 通知模擬器
- **訂單來源追蹤**：checkout API 接收 `source` 參數（web / liff / telegram / preorder）

## Bottom Sheet（2026/04/14 建立）
- `components/ui/BottomSheet.tsx` — 推薦商品/文章的底部小視窗
- 「你應該也關注」（文章）和「你可能也會喜歡」（商品）點擊先開 Bottom Sheet
- Sheet 內容：圖片 + 名稱 + 價格 + 加入購物車 / 查看詳情按鈕
- 全站生效（不只 LIFF 模式），點灰色遮罩關閉
- 不遞迴（Sheet 裡不再有推薦區）

## 圖片處理（2026/04/14 建立）
- `components/ui/ImagePlaceholder.tsx` — 品牌漸層 placeholder（7 種 type：event/article/product/topic/space/market/default）
- `components/ui/SafeImage.tsx` — 圖片載入失敗自動 fallback 到 ImagePlaceholder
- 同步管線自動上傳 Cloudinary（`migrateCoverUrls` + `migrateProductImages` in sync/route.ts）
- 下次 Notion sync 時圖片自動存為 Cloudinary 永久 URL

## Supabase 安全
- `lib/supabase.ts` 提供兩個 client：
  - `supabase` — anon key，用於前端和公開讀取
  - `supabaseAdmin` — service_role key，用於 server-side API 寫入（繞過 RLS）
- 所有寫入 API routes 已切換到 `supabaseAdmin`
- **待做**：需要在 .env.local 加 `SUPABASE_SERVICE_ROLE_KEY`，然後收緊 RLS 政策

## 注意事項
- Turbopack 快取損壞時 `rm -rf .next && npm run dev` 重啟
- 完整重裝 `rm -rf .next node_modules package-lock.json && npm install && npm run dev`
- 非英文路徑偶爾導致 Turbopack panic，重裝 node_modules 可解決
- 舊站 makesense.site 已退役，不再維護
- Build 時 `.next` 資料夾可能鎖定，需先停 dev server 再 build

---

## 📌 補充更新（2026/04/28-29 第二批）

### DB05 欄位補充（之前文件漂移漏記）
- **紀錄細項**（select）— 工作台「考勤」用：會議 / 打卡 / 請假 / 日誌 / 加班（2026/05/07 改名 + options 統一去「紀錄」後綴；舊欄位「紀錄備項」已刪）
- **請款請購**（select）— 工作台「費用」用：請購直匯 / 請款轉交
- **登記單價**（number）— 金額欄位，DB05 與 DB06 都有
- **責任執行**（people）— Notion users，工作台寫入時自動帶員工本人

### DB05 / DB06 cascade 機制（2026/04/29 釐清，2026/05/04 完工）
- 不是 Notion automation，是 **code-driven**
- 範例：`/api/staff/inventory/route.ts` 庫存異動由 Next.js API 同時寫 DB05+DB06
- 寫 DB05 時三層欄位齊全：`內容類型=報名登記` + `登記類別=紀錄庫存` + `庫存細項=進貨/出貨/盤點` + `對應明細→DB06`
- 紀錄（打卡/日誌/請假/加班）、費用（請款/請購）不需「報名登記」上游：內容類型留空，直接用紀錄細項 / 請款請購 區分
- 統一封裝在 `lib/staff-helper.ts`：`getStaffNotionPageId` / `getStaffIdByEmail` / `writeStaffDB05Record({type, detail, title, staffEmail, amount?, content?, ...})`
- 紀錄類同步到 Supabase `staff_activities`（task_type / notion_db05_id / detail jsonb），讀取走 Supabase 避免每次打 Notion API
- 費用類只寫 DB05，不雙寫 DB06（一張收據 = 一筆 DB05）
- Supabase staff_activities 額外索引：`(staff_id, task_type, created_at desc)`

### Supabase 新表（2026/04 ~ 04/29）
- **vendor_photos** — 攤商照片庫（5 類：LOGO/形象/產品/活動體驗/表演），跨次重用，含 archived_at 軟刪除
- **market_applications** — 市集擺攤申請（status: pending/approved/rejected）+ selected_photo_ids
- **point_ledger** — 會員積點流水帳（5 type：消費積點/書籍本數/付費文章/距離行程/簽到退）+ expires_at
- **point_balance**（VIEW）— 即時聚合 ledger（消費積點過濾未過期）
- **partner_metrics_v**（VIEW）— 合作夥伴 reach + conversion 即時聚合（用 publisher_notion_id 直接 join）
- 已停用：order_items.points_earned / points_status / members.points_balance（中途加錯，已 drop）

### Supabase 新欄位（2026/04/29 partner session 補完 sync route）
- products: `publisher_notion_id` text — 廠商識別（DB08 notion_id，32 碼無 dash），避免繞 persons 表；`partner_metrics_v` VIEW 用此欄 join
- events: `related_partner_ids` **text[]** / `event_category` text / `collab_type` text
- articles: `related_partner_ids` **text[]**
- ⚠️ `related_partner_ids` 實際型別是 `text[]`（PostgreSQL ARRAY），**不是** jsonb[]；寫入時用 `{id1,id2}` 格式或 JS 陣列

### 元件異動
- 新增：
  - `components/viewpoint/YilanMap.tsx` — 編輯雜誌風 SVG 地圖（取代 ViewpointExplorer），含 sidebar / 鄰縣 / 龜山島
  - `components/ui/AddToCartButton.tsx` — 直接加購車不跳頁
  - `components/ui/QuickBookButton.tsx` — 跳 /events/[slug]#booking
  - `lib/clean-title.ts` — 自動去除標題尾端裝飾 emoji
  - `lib/school-breaks.ts` — 寒暑假日期表（每年手動更新）
  - `lib/sense-data.ts` — /sense 編輯雜誌風寫死資料
- 刪除：
  - `components/bookstore/ViewpointExplorer.tsx`（被 YilanMap 取代）
  - `components/ui/WishlistButton.tsx`（收藏功能停用）

### 新頁面
- **/search?q=** — 全站搜尋結果頁（4 類分區，兩段式 Enter）
- **/market-apply/[slug]** + **/done** — 市集擺攤申請（會員登入 + 5 類照片庫）
- **/dashboard/points** — 我的積點（餘額卡 + 流水）

### /sense 改版（2026/04/27）
舊：S0 / S-D1 核心能力 / S-D2 營運績效 / S4 發展歷程
新：
- §04 / TIMELINE — Timeline 4 階段（醞釀/萌芽/擴張/深耕）
- §05A / IMPACT — 6 卡（events/partners 從 Supabase；creators/spaces/reach/press 寫死）
- §05B / CAPABILITIES — 3 大類能力（寫死於 lib/sense-data.ts）

### Footer 更新
- 「© 2012-2026 現思文化創藝術有限公司」 → 「**makesense** since 2012」

### 三角色介面開發（2026/04/29 起）
分 3 個 session 平行開發：
- **Member session** — /dashboard 主頁、/dashboard/orders、/dashboard/points、文化足跡 5 維度卡片（FootprintCard）
- **Partner session** — /dashboard/partner（5 tab）、QrScanModal 接 Supabase、partner_metrics_v
- **Staff session** — /dashboard/workbench、components/workbench/WorkbenchShell.tsx（兩入口共用）
- 共用資源（components/ui/、lib/、providers/）動之前先群組告知

### 會員中心功能完工（2026/05 Member session）

#### 積分制度
- 換算率：**10 元 = 1 點**（舊「1元=1點」已廢棄）
- 消費積點：`Math.floor(total / 10)`，checkout 時寫入 point_ledger
- /dashboard/points 顯示說明「每消費10元累積1點」

#### 文化足跡 FootprintCard
- 元件：`components/ui/FootprintCard.tsx`
- props：`icon / value / unit / label / color / hint`（value=0 顯示「—」）
- 5 維度：走讀里程(km) / 文化時數(hr) / 消費積點(點) / 書籍本數(本) / 付費文章(篇)
- 暗色卡片（背景 #1a1a2e），每卡有 9px hint 說明文字

#### events 表新欄位（2026/05）
- `duration_min` integer — 活動時長（分鐘，從 DB04「執行時間」end-start 計算，無 end 預設 120）
- `distance_km` numeric — 走讀里程（從 DB04「距離(km)」number 欄位同步）
- sync/route.ts + sync/single/route.ts 均已補上這兩個欄位

#### 走讀里程 & 文化時數串接邏輯
- 走讀里程：checkout 購走讀商品時查 events.distance_km → 寫 point_ledger(type=距離行程)
- 文化時數：走讀/市集訂單 distinct eventIds → JOIN duration_min → SUM/60 → cultureHours

#### 已廢棄欄位（2026/05 drop）
- `order_items.points_earned` / `order_items.points_status`
- `members.points_balance`
- 以上全改用 `point_ledger` 流水 + `point_balance` VIEW 聚合

#### 訂單頁顯示優化（/dashboard/orders）
- 折疊列：商品類型 chip + 名稱（最多 3 件）+「✨ +X 點」
- item 名稱取法：`item.name || item.meta?.name || "—"`（真實資料在 meta.name）
- 類型篩選 chip 動態生成，不再硬編碼英文字串

#### 新頁面（2026/05）
- `/dashboard/profile` — Email（唯讀/重綁 Google）、LINE 綁定、電話（可編輯）；API: /api/user/profile GET+PATCH
- `/dashboard/orders` — 補「← 回會員中心」返回按鈕
- 訂單空狀態引導卡片（走讀/書店）

### 合作後台功能完工（2026/04/29 ~ 05/04 Partner session）

#### partner_metrics_v VIEW
- 用途：合作後台概覽統計（商品數/缺貨/營收/售出/活動/觸及）
- 查詢方式：`.from("partner_metrics_v").eq("notion_id", notionId).maybeSingle()`
- 欄位：`notion_id, product_count, out_of_stock_count, total_revenue, conversion_count, reach_count, event_count, newsletter_count`
- 前提：`products.publisher_notion_id` 必須正確設為廠商 DB08 notion_id

#### QrScanModal（components/partner/QrScanModal.tsx）
- Props：`onClose: () => void`、`notionId?: string | null`
- QR 格式支援：純 UUID / `order:UUID` / JSON `{ order_id }` / 32 碼無 dash（自動補格式）
- 驗證流程：
  1. orders：確認存在且 status ≠ cancelled
  2. 若 checkin_status = 'checked_in' → 顯示「已取貨」狀態
  3. order_items：取 item_type = 'product' 的品項
  4. products：用 publisher_notion_id = notionId 過濾，確認此廠商擁有商品
  5. 若無匹配商品 → 顯示「非本攤商品」
  6. 確認取貨 → UPDATE orders SET checkin_status = 'checked_in'
- 狀態機：scanning → loading → found / not_found / already_checked_in / wrong_vendor / completed
- `showScanner` state 提升到 PartnerPage 層，透過 `onOpenScanner` callback 傳給 VendorOverview（確保 notionId 可存取）

#### 取貨 QR Code
- 位置：`/checkout/success`（新訂單完成後）、`/dashboard/orders/[id]`（訂單詳情）
- 套件：`qrcode.react` — `<QRCodeSVG value={orderId} size={200} level="M" />`
- value = 純 UUID（order id）
- 已取貨狀態：QR opacity 0.25 + 覆蓋綠色「✅ 已取貨」圓角 badge
- orders API 兩端均已補上 `checkin_status` 欄位（/api/orders、/api/orders/[id]）

#### sync API 更新
- `?skip-images=true` 參數：跳過 migrateCoverUrls / migrateProductImages，僅同步欄位資料（避免 Vercel 5 分鐘逾時）
- 新欄位已加入全量同步（/api/sync/route.ts）：
  - products：`publisher_notion_id`（從 DB07「對應發行」relation → DB08 notion_id）
  - events：`related_partner_ids`、`event_category`、`collab_type`
  - articles：`related_partner_ids`

#### RWD 行動版（合作後台）
- 表格全部改為 `sm:hidden` card list + `hidden sm:block` 桌面版 table 雙版本
- 按鈕最小高度 40px
- 容器 padding 行動版縮小
