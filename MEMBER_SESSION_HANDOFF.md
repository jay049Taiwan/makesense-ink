# 官網現況摘要 — 會員中心 Session 交接文件

**整理日期**：2026/04/13
**用途**：讓負責會員中心介面的 Claude Chat session 了解官網從 WP 遷移到 Vercel 後的技術架構與現況

---

## 技術棧

| 面向 | 舊版（WP） | 新版（現行） |
|------|-----------|------------|
| 框架 | PHP + Elementor | Next.js 16 + TypeScript + Tailwind CSS 4 |
| 資料庫 | WordPress MySQL | Supabase（PostgreSQL） |
| 資料來源 | Notion → n8n → WP REST API | Notion → Supabase → Next.js |
| 會員登入 | WooCommerce + LoginWP | NextAuth（Google + LINE OAuth） |
| 金流 | WooCommerce | 到門市現場付現（線上金流尚未串接） |
| 部署 | Hostinger | Vercel |
| 網域 | makesense.site | makesense.ink |
| 專案路徑 | — | makesense-ink/（本地開發） |

---

## 網站頁面結構

### 公開頁面
- `/` — 品牌首頁（雙站入口）
- `/bookstore` — 旅人書店（主題選書、風格選物、策展）
- `/book-selection` — 主題選書專頁
- `/goods-selection` — 風格選物專頁
- `/cultureclub` — 宜蘭文化俱樂部（活動、通訊、觀點、行事曆）
- `/sense` — 關於我們
- `/market-booking` — 展售合作
- `/reading-tour` — 走讀漫遊
- `/space-experience` — 空間體驗
- `/content-curation` — 地方調研
- `/viewpoint-stroll` — 文化觀點列表
- `/viewpoint/[slug]` — 觀點詳情
- `/product/[slug]` — 商品詳情
- `/post/[slug]` — 文章詳情
- `/events/[slug]` — 活動詳情
- `/checkout` — 結帳（已接 Supabase）
- `/checkout/success` — 結帳成功
- `/buy/[slug]` — 市集預購頁（無 Header/Footer）
- `/login` — 登入

### 會員中心（/dashboard）
三種角色共用 `/dashboard` 路由，依角色顯示不同介面：

| 角色 | 判斷依據 | 看到的介面 |
|------|---------|----------|
| 一般會員 | 預設 | /dashboard — 個人紀錄（購買紀錄、評價、參與分析） |
| 工作團隊 staff | DB08「對象選項」=「工作團隊」 | 多一個「工作台」分頁 /dashboard/workbench |
| 合作夥伴 vendor | DB08「對象選項」=「合作夥伴」 | 多一個「協作平台」分頁 /dashboard/partner |

Dev 環境左側有角色切換面板（DEV 角色：會員 / 工作 / 廠商），方便測試不同角色的介面。

### 一般會員介面（/dashboard）
- 問候列：姓名、Email、LINE/Telegram 綁定狀態、積分
- 我的會員條碼：QR Code（待加入）
- 我的參與分析：購買類型分佈圖、關注議題標籤、支持的作者/發行商排名
- 購買紀錄：訂單列表 + 星等評價 + 留言（已接 Supabase）

### 合作夥伴介面（/dashboard/partner）
5 個 Tab（底部 Tab Bar）：
- 📊 概覽 — 統計數字 + 近期顧客評價 + 掃碼簽到（待加入）
- 🏪 資訊 — 商品自助上架（新增/編輯/下架）
- 📦 項目 — 參與的活動和市集
- 💰 金流 — 月結明細
- ⚙️ 設定 — 單位資料

### 工作團隊介面（/dashboard/workbench）
5 個 Tab（底部 Tab Bar）：
- 📢 動態 — 庫存異動通知
- 📋 交接 — 待辦事項 + 子任務 checklist
- 📦 庫存 — 商品出貨/進貨/盤點
- ⏰ 考勤 — 打卡/日誌/請假/加班/班表
- 💰 費用 — 請款（報銷）+ 請購（採買）

工作台組件已抽到 `components/workbench/WorkbenchShell.tsx`，官網和 Telegram Mini App 共用。

### 其他會員子頁面
- `/dashboard/profile` — 個人資料
- `/dashboard/orders` — 訂單紀錄
- `/dashboard/products` — 商品管理（合作夥伴限定）
- `/dashboard/proposals` — 提案管理（合作夥伴限定）

---

## 三種入口環境

| 入口 | 路由方式 | 認證 | Header/Footer |
|------|---------|------|--------------|
| 官網瀏覽器 | 正常路由 | NextAuth | 顯示 |
| LINE LIFF | 共用路由 | LIFF SDK 靜默登入 | 隱藏，加懸浮按鈕 |
| Telegram Mini App | /telegram/workbench | initData HMAC 驗證 | 隱藏 |

Layout 判斷在 `components/ui/LayoutShell.tsx`，根據路徑和環境自動切換。

---

## Supabase 會員相關表

| 表 | 用途 |
|---|------|
| members | 會員資料（email, line_uid, telegram_uid, member_type...） |
| orders | 訂單（member_id, status, total, source...） |
| order_items | 訂單明細（order_id, item_type, quantity, price, meta...） |
| reviews | 評價（order_item_id, member_id, rating, comment） |
| registrations | 報名（attendee_name, phone, email, custom_fields...） |
| partners | 合作夥伴（notion_id, type, name, contact...） |
| staff | 工作團隊（notion_id, name, role, permissions） |
| products | 商品（notion_id, name, price, stock, images...） |
| events | 活動（notion_id, title, theme, event_date, status...） |
| space_bookings | 空間預約（booking_date, time_slot, venue, status...） |
| wishlist | 收藏 |
| page_views | 瀏覽紀錄 |
| search_logs | 搜尋紀錄 |

`orders.source` 欄位區分來源：`web` / `liff` / `telegram` / `preorder`

---

## 目前狀態

| 功能 | 狀態 |
|------|------|
| 所有頁面 UI | ✅ 已建好 |
| 結帳流程 → Supabase | ✅ 已接（orders + order_items） |
| 會員購買紀錄 + 評價 | ✅ 已接 Supabase（有 mock fallback） |
| 合作後台 | ✅ UI 完成，用 mock data |
| 工作台 | ✅ UI 完成，用 mock data |
| Notion ↔ Supabase 同步 | ⬜ 規劃中（指南已寫好） |
| LINE LIFF 整合 | ⬜ 架構已預留，尚未實作 |
| 多語言（中英日韓） | ⬜ 架構已預留，尚未實作 |

---

## 關鍵檔案位置

| 檔案 | 用途 |
|------|------|
| `app/dashboard/page.tsx` | 會員中心主頁（含購買紀錄、評價、分析） |
| `app/dashboard/partner/page.tsx` | 合作後台（5 Tab） |
| `app/dashboard/workbench/page.tsx` | 工作台入口（載入 WorkbenchShell） |
| `app/dashboard/profile/page.tsx` | 個人資料 |
| `app/dashboard/products/page.tsx` | 商品管理 |
| `app/dashboard/proposals/page.tsx` | 提案管理 |
| `components/workbench/WorkbenchShell.tsx` | 工作台共用組件 |
| `components/ui/LayoutShell.tsx` | Header/Footer 切換邏輯 |
| `lib/supabase.ts` | Supabase client |
| `lib/mock-data.ts` | 假資料（開發用） |
| `lib/auth.ts` | NextAuth 設定 |

---

## 開發方式

```bash
cd makesense-ink
npm run dev        # 啟動本地開發（Turbopack，localhost:3000）
```

左側 DEV 角色面板可切換：會員 / 工作 / 廠商，不需要真實登入就能測試各角色介面。
