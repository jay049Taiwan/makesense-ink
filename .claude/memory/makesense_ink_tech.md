---
name: makesense.ink 新官網技術規格
description: makesense.ink Next.js 新官網的完整技術棧、頁面結構、Supabase 表、三種入口環境與目前開發狀態
type: project
originSessionId: bb452dd1-ceac-4cc1-83e4-aa966b9112aa
---
## 基本資訊
- **網域**: makesense.ink（舊站 makesense.site 退役中）
- **本地路徑**: `/Users/jay049/Code/makesense-ink/`
- **部署**: Vercel

## 技術棧
- Next.js 16.2.3（2026 年正式版，Turbopack 為預設打包器）
- TypeScript + Tailwind CSS 4
- Supabase（PostgreSQL）
- NextAuth（Google + LINE OAuth）
- 資料流：Notion → Supabase → Next.js

## 與舊站的關係
- makesense.site（WP）新站上線後退役，**不再需要維護或清理**
- 用戶資料從零開始，**不遷移** WooCommerce 會員資料
- **Why**: 舊站會員數量少，資料結構完全不同，Notion DB08 已有客戶關係資料，等 Notion↔Supabase 同步建好後自然灌入

## 三種入口環境
| 入口 | 路由 | 認證 | Header/Footer |
|------|------|------|--------------|
| 官網瀏覽器 | 正常路由 | NextAuth | 顯示 |
| LINE LIFF | 共用路由 | LIFF SDK 靜默登入 | 隱藏 + 懸浮按鈕 |
| Telegram Mini App | /telegram/workbench | initData HMAC 驗證 | 隱藏 |

判斷邏輯在 `components/ui/LayoutShell.tsx`

## 三種角色（共用 /dashboard）
| 角色 | 判斷依據 | 額外頁面 |
|------|---------|---------|
| 一般會員 | 預設 | — |
| 工作團隊 staff | DB08「關係選項」=「工作團隊」 | /dashboard/workbench |
| 合作夥伴 vendor | DB08「關係選項」=「合作夥伴」 | /dashboard/partner |

Dev 環境有角色切換面板方便測試。

## 關鍵檔案
- `app/dashboard/page.tsx` — 會員中心主頁
- `app/dashboard/partner/page.tsx` — 合作後台（5 Tab）
- `app/dashboard/workbench/page.tsx` — 工作台入口
- `components/workbench/WorkbenchShell.tsx` — 工作台共用組件（官網 + Telegram 共用）
- `components/ui/LayoutShell.tsx` — Header/Footer 切換邏輯
- `lib/supabase.ts` — Supabase client
- `lib/mock-data.ts` — 假資料（開發用）
- `lib/auth.ts` — NextAuth 設定

## 目前開發狀態（2026/05/04 更新）
- ✅ 所有頁面 UI 完成
- ✅ 結帳流程 → Supabase（orders + order_items）
- ✅ 會員購買紀錄 + 評價
- ✅ 合作後台（Supabase 真實資料）、partner_metrics_v VIEW、QrScanModal Supabase 驗證、取貨 QR Code
- ✅ 工作台（Notion API 直接查詢）、DB05/DB06 cascade（lib/staff-helper.ts）
- ✅ Notion ↔ Supabase 同步（即時同步 + 每日全量同步並行）
- ✅ LINE LIFF 整合（Rich Menu 六宮格、模擬器、靜默登入）
- ✅ 多語言中英日韓（next-intl + translations 表 + Claude Haiku AI 翻譯）
- ✅ SEO 全套（sitemap, robots, RSS, JSON-LD, OG tags）
- ✅ 圖片自動遷移 Cloudflare R2（2026/04/29 從 Cloudinary 換過來）
- ✅ 發佈/下架流程（Notion 按鈕觸發）
- ✅ 三角色介面（Member/Partner/Staff dashboard，分 session 平行開發）
- ✅ 會員積點（point_ledger + point_balance VIEW + /dashboard/points）
- ✅ 市集擺攤申請（/market-apply + vendor_photos 5 類照片庫）
- ✅ publisher_notion_id backfill（products 欄位，廠商識別用）

## 啟動方式
```bash
cd makesense-ink
npm run dev   # localhost:3000，Turbopack
```

## 📌 Member Session 完工（2026/05）

### 積分制度：10元=1點
- 消費積點：`Math.floor(total / 10)`（checkout 寫 point_ledger）
- /dashboard/points 說明：「每消費10元累積1點」
- 舊「1點=1元」已廢棄

### 文化足跡 FootprintCard（5 維度）
- 元件：`components/ui/FootprintCard.tsx`，props：icon/value/unit/label/color/hint（value=0 顯示"—"）
- 5 維度：走讀里程(km)、文化時數(hr)、消費積點(點)、書籍本數(本)、付費文章(篇)
- 暗色卡片（#1a1a2e 背景），每卡有 hint 9px 小字說明

### 走讀里程串接（2026/05 完整鏈路）
1. Notion DB04 新增「距離(km)」number 欄位
2. sync/route.ts + sync/single/route.ts → `events.distance_km`
3. checkout 購走讀商品時查 events.distance_km → 寫 point_ledger(type=距離行程)
4. point_balance VIEW 聚合 distance_km
5. /api/points 回傳，前端顯示 footprint.distanceKm

### 文化時數串接
- DB04「執行時間」end-start 差值（分鐘），無 end date 預設 120
- sync 寫 `events.duration_min`
- /api/points 計算：走讀/市集訂單 distinct eventIds → JOIN duration_min → SUM/60 → cultureHours

### events 表新欄位（2026/05）
- `duration_min` integer — 活動時長（分鐘）
- `distance_km` numeric — 走讀里程（km）

### 已廢棄 Supabase 欄位（2026/05 drop）
- order_items.points_earned / points_status
- members.points_balance
（以上改用 point_ledger + point_balance VIEW）

### 訂單顯示優化
- 折疊列：商品類型 chip + 名稱（最多3件）+ "✨ +X 點"
- 名稱取法：`item.name || item.meta?.name || "—"`（真實資料存在 meta.name）
- 類型篩選 chip 動態生成（不再硬編碼英文）
- 消費明細 header：「📦 全部訂單 →」+「✨ 我的積點 →」

### 新頁面
- `/dashboard/profile` — Email(唯讀/重綁 Google)、LINE 綁定、電話(可編輯)；API: /api/user/profile GET+PATCH
- `/dashboard/orders` — 補 `← 回會員中心` 返回

### 空狀態引導
- purchases.length === 0 時顯示引導卡片（走讀/書店）

---

## ⚠️ 路徑變更（2026/05/10）
**本地路徑已從** `~/Code/makesense-ink/` **改為** `~/Code/makesense-ink/`
- 原因：iCloud 同步把 git 鎖死，搬出 iCloud 同步區
- 舊路徑保留不動（當備份），不要再寫
- 所有檔案（含 4 個剛 push 的 commit）已 byte-perfect 同步到新路徑
