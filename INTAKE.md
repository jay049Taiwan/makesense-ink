# makesense.ink — 視覺改版 INTAKE

文件對象：負責設計改版的 Claude session
狀態：2026-05-05 整理
專案擁有者：Noah（現思文化創藝術有限公司）

---

## 1. 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Next.js **16.2.3** (App Router, Turbopack) |
| 樣式 | Tailwind CSS **4** (`@theme inline`) + globals.css CSS variables |
| 語言 | TypeScript 5 |
| Runtime | React 19.2.4 |
| Hosting | Vercel |
| 認證 | next-auth 5 (Google + LINE OAuth) + Supabase SSR |
| 資料庫 | Supabase (PostgreSQL, project: `zgwdomvauuxaxtgqqvrn`) |
| CMS | Notion API (`@notionhq/client` 5.17) — 9 個 DB（DB01~DB09） |
| 國際化 | next-intl 4.9（架構備好，翻譯資料尚未完整） |
| 圖片 CDN | Cloudinary（新版照片管線正在改用 Cloudflare R2，但 makesense.ink 站內目前還是 Cloudinary） |
| LIFF SDK | `@line/liff` 2.28 |
| LINE Bot | `@line/bot-sdk` 11 |
| 條碼掃描 | `html5-qrcode` 2.3 |
| QR 產生 | `qrcode.react` 4.2 |

---

## 2. 頁面清單

URL 一律可加 locale 前綴 `/zh-TW`、`/en`、`/ja`、`/ko`（檔案位置：`app/[locale]/...`）。

### 公開頁（瀏覽 / 採購）

| URL | 用途 | 主要區塊 |
|------|------|----------|
| `/` | 品牌首頁 | Hero 輪播 / 統計數字 / 雙品牌入口 / 近期活動 |
| `/sense` | 關於我們 | Timeline 4 階段 / 影響力 6 卡 / 三大能力 |
| `/bookstore` | 旅人書店 | 主題選書 / 風格選物 / 策展 / 地方通訊 |
| `/book-selection` | 主題選書列表 | 篩選器 + 商品卡片 grid |
| `/goods-selection` | 風格選物列表 | 同上 |
| `/cultureclub` | 宜蘭文化俱樂部 | 活動 / 通訊 / 觀點 / 選書選物 / 行事曆 |
| `/market-booking` | 展售合作 | 自有產品 / 地方品牌展售 / 市集招商 |
| `/reading-tour` | 走讀漫遊 | 走讀關鍵字 / 路線地圖 |
| `/space-experience` | 空間體驗 | 空間租借行事曆 |
| `/content-curation` | 地方調研 | 統計 / 採輯主題 / 相關人物 |
| `/local-newsletter` | 地方通訊存檔 | 文章列表（DB05 articles） |
| `/viewpoint-stroll` | 文化觀點列表 | 觀點卡片 grid |
| `/viewpoint/[slug]` | 觀點詳情 | 單一觀點頁面 |
| `/post/[slug]` | 文章詳情 | Notion blocks → HTML，正文 + 推薦 |
| `/events/[slug]` | 活動詳情 | Hero + 路線 + 票券選擇 + 報名 |
| `/product/[slug]` | 商品詳情 | 圖片 + 規格 + 加購車 |
| `/buy/[slug]` | 市集預購頁（無 Header/Footer） | 純表單，廠商商品 |
| `/search?q=` | 全站搜尋 | 4 類分區（活動/文章/商品/觀點） |

### 結帳

| URL | 用途 |
|------|------|
| `/checkout` | 結帳 → 寫入 Supabase orders + order_items + registrations |
| `/checkout/success` | 結帳成功（含取貨 QR Code） |

### 會員（dashboard）

| URL | 用途 | 角色限制 |
|------|------|----------|
| `/login` | 登入（Google / LINE OAuth） | — |
| `/dashboard` | 會員中心首頁（個人紀錄、文化足跡 5 維度） | 一般會員 |
| `/dashboard/profile` | 個人資料 | 全角色 |
| `/dashboard/orders` | 訂單紀錄 | 全角色 |
| `/dashboard/orders/[id]` | 訂單詳情 + 取貨 QR | 全角色 |
| `/dashboard/points` | 我的積點 | 全角色 |
| `/dashboard/workbench` | 工作台（5 Tab：動態 / 交接 / 庫存 / 紀錄 / 費用） | staff |
| `/dashboard/partner` | 合作後台（5 Tab：概覽 / 資訊 / 項目 / 金流 / 設定） | partner |
| `/dashboard/products` | 商品管理 | partner |
| `/dashboard/proposals` | 提案管理 | partner |

### LIFF 入口（手機 LINE 內開）

無 Header/Footer，由 LIFF SDK 靜默登入。

| URL | 用途 |
|------|------|
| `/liff/shop` | 搜尋 + 條碼掃描 + 商品推薦 |
| `/liff/events` | 未來活動卡片列表 |
| `/liff/viewpoints` | GPS → 鄉鎮觀點 |
| `/liff/newsletter` | 最近 20 則文章 |
| `/liff/member` | 會員資訊 + LINE 綁定 |
| `/liff/profile` | LIFF 內個人資料 |
| `/liff/cancel-event` | LIFF 內取消報名 |
| `/liff/mood-books` | 心情選書 |

### Telegram Mini App

無 Header/Footer，由 Telegram initData HMAC 驗證。

| URL | 用途 |
|------|------|
| `/telegram/workbench` | Telegram 內的工作台（與 `/dashboard/workbench` 共用 UI） |

### 雜項

| URL | 用途 |
|------|------|
| `/privacy` | 隱私政策 |
| `/terms` | 服務條款 |
| `/dev/line-simulator` | dev-only LINE 聊天室模擬器（iframe 載入帶 `?liff_mode=true`） |
| `/market-apply/[slug]` | 市集擺攤申請 |
| `/market-apply/[slug]/done` | 申請完成 |

---

## 3. 頁面結構樹（重點頁）

> 詳細區塊命名請參考 Notion 「官網同步區」：`3419ff25fdab80f59b03fcafbd9c7bb8`

### `/` 首頁
```
Header
└─ HeroCarousel（Supabase events + articles 動態生成輪播）
└─ 統計區（數字：活動場數 / 合作夥伴 / 服務人次）
└─ 雙品牌入口（旅人書店 / 宜蘭文化俱樂部）
└─ 近期活動（最多 4 張卡片）
└─ Footer
└─ FloatingActions（LINE + 購物車浮動按鈕）
```

### `/bookstore`
```
Header
└─ B0 Hero
└─ B1 主題選書 (4 個橫向卡片 + 「前往更多」→ /book-selection)
└─ B2 風格選物 (同上 → /goods-selection)
└─ B3 策展（特定 events）
└─ B4 主題策展 (DB08 viewpoint topics)
└─ B5 地方通訊 (DB05 articles → /local-newsletter)
└─ Footer
```

### `/cultureclub`
```
Header
└─ C0 Hero
└─ C1 近期活動
└─ C2 地方通訊（articles → /content-curation）
└─ C3 話題觀點（topics → /viewpoint-stroll）
└─ C4 選書選物
└─ C5 行事曆 Calendar 元件
└─ Footer
```

### `/sense`（關於我們）
```
Header
└─ §01 上半部：DB05「官網備項=關於我們」的 Notion blocks
└─ §02 下半部 動態區：
   ├─ §04 / TIMELINE — 4 階段（醞釀/萌芽/擴張/深耕）
   ├─ §05A / IMPACT — 6 張影響力卡（events/partners 動態 + 4 卡寫死）
   └─ §05B / CAPABILITIES — 3 大類能力（lib/sense-data.ts 寫死）
└─ Footer (© 「makesense since 2012」)
```

### `/events/[slug]`（活動詳情）
```
Header
└─ Hero (cover image + title + date/location/guide)
└─ Excerpt (簡介摘要)
└─ Route stops（活動路線 — 4 站點以虛線連起）
   └─ 距離 km 顯示
   └─ 點擊 stop 彈出 popup（描述 + ImagePlaceholder）
└─ Full description content
└─ Keywords chips
└─ Right sidebar：票券選擇器
   ├─ Tickets（DB07 對應庫存）
   ├─ Addons（加購）
   ├─ 合計
   └─ 立即報名 / 結帳按鈕
└─ AlsoWantToKnow / MightAlsoLike (推薦商品/文章)
└─ RegistrationModal (報名彈出表單)
└─ Footer
```

### `/dashboard/workbench`
```
LayoutShell（沒 Telegram 環境會有 Header）
└─ 標題列「林XX 您好」+ email
└─ Tab Bar (sticky)：動態 / 交接 / 庫存 / 紀錄 / 費用
└─ Tab content (各 Tab 一個 component)
└─ Footer (官網入口) / 無 Footer (Telegram 入口)
```

---

## 4. 共用元件

`components/ui/`

| 元件 | 用途 | 哪些頁面用 |
|------|------|-----------|
| `Header.tsx` | 全站頂部 — 雙品牌標題 / 搜尋 / 語系切換 / 登入登出 | 全部公開頁 |
| `Footer.tsx` | 全站底部 — 5 連結 + 社群 + 地址 | 全部公開頁 |
| `LayoutShell.tsx` | 判斷是否顯示 Header/Footer（`/telegram` `/buy/*` `?liff_mode=true` 隱藏） | layout root |
| `FloatingActions.tsx` | 右下角浮動 LINE + 購物車（滑到 footer 自動上推） | 全站 |
| `FloatingCart.tsx` | LIFF 模式專用浮動車 | LIFF 路徑 |
| `CartBadge.tsx` | 已棄用（被 FloatingActions 取代） | — |
| `BottomSheet.tsx` | 推薦點擊後底部彈窗 | 文章/商品/活動詳情 |
| `HeroCarousel.tsx` | 首頁 + 書店首頁的 Hero 輪播 | `/` `/bookstore` |
| `RecommendSections.tsx` | 「也許關注 / 也會喜歡」 | 詳情頁 |
| `SectionCarousel.tsx` | 通用橫向卷軸 | bookstore / cultureclub |
| `SearchDropdown.tsx` | Header 搜尋下拉建議 | Header |
| `ImagePlaceholder.tsx` | 7 種 type 的品牌漸層占位圖 | 全站 |
| `SafeImage.tsx` | 載入失敗自動 fallback ImagePlaceholder | 全站 |
| `Skeleton.tsx` | 載入骨架屏 | 全站 loading.tsx |
| `AddToCartButton.tsx` | 加購車（直接） | 商品/活動 |
| `QuickBookButton.tsx` | 跳到活動詳情 #booking | 卡片 |
| `PaywallButton.tsx` | 付費內容解鎖按鈕 | post 詳情 |

`components/calendar/Calendar.tsx` — 行事曆元件（mode="default" / "space" / "market"）
`components/booking/RegistrationModal.tsx` — 報名表單彈窗
`components/sense/` — /sense 頁專用元件
`components/viewpoint/YilanMap.tsx` — 編輯雜誌風 SVG 宜蘭地圖
`components/workbench/WorkbenchShell.tsx` — 工作台（兩個入口共用）
`components/partner/` — partner dashboard 內部元件
`components/dashboard/` — dashboard 內部元件
`components/liff/` — LIFF 內部元件
`components/bookstore/` — bookstore 頁區塊
`components/providers/CartProvider.tsx` — 購物車 React Context
`components/providers/DevRoleProvider.tsx` — dev 模式角色切換
`components/tracking/` — 追蹤打點

---

## 5. 資料來源

### CMS 動態（從 Notion → Supabase 同步）

| Supabase 表 | 來源 | 用途 |
|-------------|------|------|
| `articles` | DB05（文案細項=官網內容） | 文章 / 通訊 |
| `events` | DB04（協作類別=活動辦理） | 活動 |
| `products` | DB07 | 商品 / 票券 |
| `topics` | DB08（經營類型=觀點/標籤） | 觀點 / 標籤 |
| `persons` | DB08（會員狀態=會員 + 關係選項=個人） | 帶路老師 / 創作者 |
| `partners` | DB08（會員狀態=會員 + 關係選項=合作夥伴） | 廠商 |
| `members` | DB08（會員狀態=會員） | 會員 |
| `staff` | DB08（會員狀態=會員 + 關係選項=工作團隊） | 工作團隊 |

### 完全動態（Supabase 寫入，無 Notion 同步）

`orders` / `order_items` / `registrations` / `reviews` / `wishlist` / `page_views` / `search_logs` / `partner_metrics_v` (VIEW) / `point_ledger` / `staff_activities` / `vendor_photos` / `market_applications` / `space_bookings` / `social_metrics` / `translations` / `line_message_log`

### 寫死（hardcoded in code）

- `/sense` Timeline 4 階段、3 大能力 → `lib/sense-data.ts`
- 寒暑假日期表 → `lib/school-breaks.ts`
- 行政區地圖座標 → `components/viewpoint/YilanMap.tsx`
- DevRole mock profiles → `components/providers/DevRoleProvider.tsx`

### Notion 端 sync 觸發

- 每筆按「發佈更新」按鈕 → n8n webhook → `/api/sync/single`（即時）
- 每天 8AM n8n 全量同步（workflow ID: `C8Tc2zIoSW4THUr2`）
- 「發佈狀態」是同步觸發的單一真相欄位（DB04 舊名「登記發佈」已撤回統一）

---

## 6. Design tokens（**改版可動但要保留語意**）

定義在 `app/globals.css` `@theme inline` 區塊。

### 主色票（品牌調性偏暖、土系、低飽和）

```css
--color-ink: #1a1612;          /* 主文字 */
--color-warm-white: #faf8f5;   /* 背景 */
--color-parchment: #f2ede6;    /* 次背景 */
--color-dust: #e8e0d4;         /* 邊線 / 分隔 */
--color-bark: #8b7355;         /* 棕褐主強調（旅人書店色） */
--color-moss: #5c6b4a;         /* 主按鈕綠 */
--color-rust: #b5522a;
--color-mist: #9ba8a0;         /* 次要灰綠 */
--color-sky: #3a5c78;
--color-gold: #b8943c;
--color-teal: #4ECDC4;         /* 宜蘭文化俱樂部色 */
--color-teal-hover: #3dbdb5;
```

### 語意色（calendar、badge）

```css
/* Calendar */
--color-cal-saturday/sunday/weekend-text/holiday-bg/holiday-text/today/market/blocked

/* Badges (4 類分區色) */
--color-badge-article-{bg,text}    綠
--color-badge-event-{bg,text}      橘
--color-badge-product-{bg,text}    藍
--color-badge-experience-{bg,text} 粉
```

### 字型

```css
--font-sans:    "Noto Sans TC"        /* 內文 */
--font-serif:   "Noto Serif TC"       /* 標題 */
--font-display: "Playfair Display"    /* 品牌、頂級展示 */
```

字型透過 Google Fonts CDN 載入：`app/[locale]/layout.tsx` 第 92 行 `<link rel="preload">`

### 間距/寬度規範

- 頁面最大寬度：**1200px**（多數）/ **1000px**（走讀、空間、地方調研）/ 1160px（events 詳情）
- 文案區塊：1000px / 1200px（展售合作）
- 行事曆：1000px

### 響應式斷點（Tailwind 4 預設）

`sm:` 640px / `md:` 768px / `lg:` 1024px / `xl:` 1280px

### 圓角 / 陰影

- Buttons: `rounded` (4px) / `rounded-full` (圓形)
- Cards: 沒有統一規範，多數用 `rounded-lg` (8px) 或 inline border
- Shadow: `shadow-sm` / `shadow-lg`（floating actions）

---

## 7. 資產目錄

```
public/
├─ file.svg, globe.svg, next.svg, vercel.svg, window.svg  (Next.js 預設)
├─ geo/         (行政區圖 GeoJSON 用於 YilanMap)
└─ images/      (品牌圖、占位圖)
```

**動態圖片來源**（不在 public）：
- 文章 / 商品 / 活動圖：Cloudinary（同步 pipeline 自動上傳，URL 寫進 Supabase）
- Notion 內部圖片：`/api/notion-image?pageId=xxx` 代理 API（解 1 小時過期問題）

字型：Google Fonts CDN（沒有自託管）
Icon：直接 inline SVG 寫在元件裡（沒有用 icon library）

---

## 8. 已知限制

### 不能動

| 項目 | 為什麼 |
|------|--------|
| 路由結構 `/[locale]/...` | next-intl 多語系靠這個 |
| Notion sync 流程 | 編輯靠按「發佈更新」，改變這個會打亂內容運營 |
| `events.tickets` / `events.route_stops` jsonb 欄位的格式 | sync route 會寫入這格式，前端 parse 也認這格式 |
| Footer 的 5 連結順序與名稱 | 內容運營鎖定的入口 |
| LIFF 路徑 `/liff/*` 的 6 宮格設計 | LINE Rich Menu 已對應 |
| 三角色判斷邏輯 | DB08「會員狀態 + 關係選項」是內容運營的真相 |

### 第三方嵌入

- Google Fonts CDN（外部依賴）
- Cloudinary（圖片 CDN）
- LIFF SDK（LINE 內 JS 注入）
- next-auth Google/LINE OAuth flow

### SEO 已做

`robots.ts` / `sitemap.ts` / `manifest.ts` / `feed.xml` / `not-found.tsx` / `error.tsx` / Loading skeleton 全頁齊
JSON-LD：Organization 全域、Event detail、Product detail
全域 OG/Twitter tags + canonical URL（`app/[locale]/layout.tsx`）

---

## 9. 目前痛點 / 改版重點需求

排序大致依「最想動 → 後備」：

1. **手機版整體字級偏大** — 已在 Header/Footer 做 responsive，但 Hero / 卡片 / 詳情頁仍是桌機尺寸延伸
2. **首頁 Hero 輪播太「網路相簿」** — 缺乏品牌敘事感
3. **`/sense` 編輯雜誌風強，但其他頁感覺不一致** — 整體缺一個視覺語言貫穿
4. **`/cultureclub` 區塊太多太雜** — C1~C5 各區資訊密度不均
5. **詳情頁（events / post / product）視覺單薄** — 沒有 hero、留白多但缺氣質
6. **/dashboard/* 是純功能介面** — 沒有設計感，用 Tailwind utility 堆出來的
7. **行事曆元件（Calendar）配色偏軟、可讀性中等** — 假日/活動色塊較難分辨
8. **卡片設計不統一** — bookstore / cultureclub / market-booking 各自不同 Card 樣式
9. **Hero 圖片載入慢** — Cloudinary 的圖檔太大，沒做 srcset
10. **改版要保留**：暖色 + 土系基調、雙品牌色（bark棕褐 + teal青）、Noto Sans/Serif 字體

### 想保留的功能

- 三角色（一般 / staff / partner）dashboard 區隔
- 行事曆 mode 切換（default / space / market）
- 「發佈更新」按鈕觸發即時同步邏輯
- LIFF 模式自動隱藏 Header/Footer
- Bottom Sheet 推薦互動
- Footer 浮動 LINE + 購物車按鈕（最近加了「滑到 footer 自動上推」邏輯）
- DevRoleProvider 開發環境角色切換
- 所有 Cloudinary URL 管線

---

## 10. 現況截圖

**改版 session 請自行從 production 抓**（避免本地 dev 的 mock fallback 干擾）：

| 路徑 | 對應 file（程式入口） |
|------|----------------------|
| https://makesense.ink/ | `app/[locale]/page.tsx` |
| https://makesense.ink/sense | `app/[locale]/sense/page.tsx` |
| https://makesense.ink/bookstore | `app/[locale]/bookstore/page.tsx` |
| https://makesense.ink/cultureclub | `app/[locale]/cultureclub/page.tsx` |
| https://makesense.ink/market-booking | `app/[locale]/market-booking/page.tsx` |
| https://makesense.ink/reading-tour | `app/[locale]/reading-tour/page.tsx` |
| https://makesense.ink/space-experience | `app/[locale]/space-experience/page.tsx` |
| https://makesense.ink/content-curation | `app/[locale]/content-curation/page.tsx` |
| https://makesense.ink/local-newsletter | `app/[locale]/local-newsletter/page.tsx` |
| https://makesense.ink/viewpoint-stroll | `app/[locale]/viewpoint-stroll/page.tsx` |
| https://makesense.ink/events/{slug} | `app/[locale]/events/[slug]/page.tsx` |
| https://makesense.ink/post/{slug} | `app/[locale]/post/[slug]/page.tsx` |
| https://makesense.ink/product/{slug} | `app/[locale]/product/[slug]/page.tsx` |
| https://makesense.ink/checkout | `app/[locale]/checkout/page.tsx` |
| https://makesense.ink/dashboard | `app/[locale]/dashboard/page.tsx` |
| https://makesense.ink/dashboard/workbench | `app/[locale]/dashboard/workbench/page.tsx` (＋ `components/workbench/WorkbenchShell.tsx`) |
| https://makesense.ink/dashboard/partner | `app/[locale]/dashboard/partner/page.tsx` |

行動裝置請用 Safari Responsive Mode 或 Chrome DevTools 模擬 iPhone 14（390×844）。

---

## 結尾

任何看不懂的地方，我（負責 makesense.ink 工程的 Claude session）都能補資料。改版過程中如果牽涉到資料流改動（譬如新增 Supabase 欄位、改 sync route）、需要 Vercel 部署、或要動 Notion DB schema，請先跟我同步，避免內容運營流程被改壞。
