# makesense.ink 上線前狀態交接

> 最後更新：2026/04/20
> 用途：給其他 Claude session 繼續接手，不必再掃一次

---

## 🟢 Session 10（本輪）已解決的問題

| # | 問題 | 根因 | 修復 |
|---|------|------|------|
| 1 | /login 404 | app/[locale]/login/ 只有 DevLogin.tsx 無 page.tsx | 新增 page.tsx（Google + LINE OAuth 登入頁）|
| 2 | /sitemap.xml 404 | proxy.ts matcher 漏掉 | 加入排除清單 |
| 3 | /robots.txt 404 | 同上 | 同上 |
| 4 | /manifest.webmanifest 404 | 同上 | 同上 |
| 5 | /dashboard/partner 等 5 個子路由 404 | /app/dashboard/ 有檔案但不在 [locale] 下，SessionProvider context 拿不到 | 搬到 /app/[locale]/dashboard/，刪掉 /app/dashboard/ |
| 6 | /checkout/success 404 | 同類型：[locale] 下是空殼，實際 page.tsx 在外層 | 搬遷 + 刪外層 |
| 7 | 6 個詳情路由重複結構（events、product、viewpoint 等）| 同類型 shadow 問題 | 刪外層、保留新版 layout.tsx 移進 [locale] |
| 8 | 中文 Tailwind → Next.js proxy | middleware 檔案慣例已棄用（Next.js 16）| middleware.ts → proxy.ts |
| 9 | 首頁 `<title>` 顯示「現思文化創藝術 | makesense」太生硬 | 改為「旅人書店/宜蘭文化俱樂部」 |
| 10 | 推薦區「你應該也關注」文章卡片沒按鈕 | price=0 時按鈕被隱藏 | 改成永遠顯示按鈕 |
| 11 | 5 個舊 WP 同步 n8n workflow 仍 active | 舊 WP 站已退役但 workflow 沒關 | 全部 unpublish + archive（含歷史那個共 6 個）|

---

## 🔴 尚未解決 — 最優先

### A. 結帳流程缺 Notion 回寫與庫存扣減（missing feature）

**實測案例**：2026/04/19 22:25，訂單 id `f1f96ef0-ce8f-41f7-a991-9f43c8dccb60`，買書 279 元 1 本。

| 預期 | 實際 |
|------|------|
| Supabase orders 寫入 | ✅ 有 |
| Supabase order_items 寫入 | ✅ 有（但 item_id 格式有 bug，見下） |
| Supabase products.stock - 1 | ❌ 沒扣（從 2 還是 2）|
| Notion DB07「該書賣掉 1 本」 | ❌ 沒紀錄 |
| Notion DB05「結帳 1 次」 | ❌ 沒紀錄 |
| Notion DB08「客戶買該書」 | ❌ 沒紀錄 |
| LINE 訂單通知 | ⏳ 未驗證 |

**根因**：`app/api/checkout/route.ts` 只寫 Supabase 三張表，沒有扣庫存、沒有 Notion 回寫程式碼。

**怎麼做**：
1. 在 checkout route 最後加入：
   - `UPDATE products SET stock = stock - qty WHERE id = ?` （迴圈 order_items）
   - 呼叫 Notion API 在 DB05 建立一筆「結帳」紀錄（表單類型=共識互動）
   - 呼叫 Notion API 在 DB06 建立進銷明細（明細類型=出貨）
   - 若 Supabase→Notion 即時回寫複雜，可改 n8n webhook 非同步處理
2. DB08 的客戶購買紀錄可透過 members.notion_id + purchase aggregate view 顯示，不一定要逐筆寫 DB08

### B. order_items.item_id 格式 bug

- `order_items.item_id` 寫入的是 **帶 dash 的 UUID 格式**（例 `13d7cc3f-07c9-4b43-b24c-44eebfa8bdaa`）
- `products.notion_id` 存的是 **不帶 dash 的 Notion ID 格式**（例 `13d7cc3f07c94b43b24c44eebfa8bdaa`）
- 兩者永遠 JOIN 不起來
- 需改 checkout 前端或 API，統一格式（建議：order_items.item_id 直接存 products.id（Supabase UUID）或 products.notion_id 無 dash 版本）

### C. 資料大量未發佈

| 類型 | 已上架 | 未上架 | 上架率 |
|------|--------|--------|--------|
| articles | 17 | 1,764 | 0.9% |
| events | 27 | 732 | 3.6% |
| products | 35 | 5,324 | 0.6% |
| topics | **0** | 628 | 0% |
| partners | **0** | 1,340 | 0% |

**影響**：
- /viewpoint-stroll 完全空白（topics 0 published）
- 首頁「走讀活動=0」「合作品牌=0」
- events 27/27 全缺封面圖
- articles 17/17 全缺封面圖
- events 21/27 缺 location
- products 22/35 stock=0（會出現在搜尋但不出列表）

**建議**：
- 批次選 50 筆觀點、30 筆合作夥伴發佈
- 批次補 events/articles 封面圖

---

## 🟡 iCloud 同步造成的幽靈問題

**現象**：刪除 `/app/dashboard/`、`/app/bookstore/` 等資料夾後，過一會兒會自動還原（內容是舊版）。

**原因**：專案位於 `~/Documents/工作參考資料/makesense-ink/`，Mac 預設把 Documents 同步到 iCloud Drive。本地刪除後，iCloud 從雲端還原舊版檔案。

**解決方案**（擇一）：
1. **最根本**：把專案搬到 iCloud 不同步的位置（例如 `~/code/` 或 `~/Developer/`）
2. **妥協**：在 iCloud Drive 設定裡停用 Documents 同步
3. **暫時**：每次 clean 前確認 git 是乾淨的，發現幽靈檔案就 `rm -rf` + 立刻 `git commit`

---

## ⏳ 需要手動測試（2 組測試帳號）

### 角色與入口

| 角色 | 帳號 | 需要的 Notion 設定 |
|------|------|-------------------|
| 訪客 | 無痕視窗 | — |
| 一般會員 | （任何 Google/LINE 登入）| — |
| 合作夥伴 | Noah 帳號 #1 | DB08「關係選項=合作夥伴」+ 該筆設發佈 |
| 工作團隊 | Noah 帳號 #2 | DB08「關係選項=工作團隊」+ 該筆設發佈 |

**注意**：目前 partners 0 published、persons 中對象屬性也沒發佈，**所以現在登入任何人都會被判定為一般會員**（即使帳號 #1 #2 也看不到 partner/staff 分頁）。測試前要先在 Notion 把自己的 DB08 紀錄發佈出來。

### 入口環境

1. **官網瀏覽器** — Chrome/Safari
2. **LINE LIFF** — 手機 LINE 點 Rich Menu 按鈕開啟（LIFF ID: 2009300819-5OyjRae6）
3. **Telegram Mini App** — /telegram/* 路徑

### 測試清單

#### 訪客 × 官網瀏覽器
- [ ] 首頁能看到統計數字、雙品牌、近期活動
- [ ] 「註冊/登入」→ /login 顯示 Google/LINE 登入按鈕
- [ ] 加入購物車 → 按結帳 → 是否提示登入
- [ ] 搜尋「羅東」有即時結果 + search_logs 寫入
- [ ] Header 購物車 badge 數字正確
- [ ] Bottom Sheet 推薦商品/文章點擊出現
- [ ] /en/ /ja/ /ko/ 語言切換

#### 一般會員 × 官網瀏覽器
- [ ] Google 登入成功 → 導向 /dashboard
- [ ] LINE 登入成功
- [ ] /dashboard 顯示個人資料
- [ ] /dashboard/profile 可編輯
- [ ] /dashboard/orders 顯示訂單紀錄
- [ ] **完整下單流程**：加購 → 結帳 → /checkout/success → 確認 Supabase orders 寫入、**確認 Notion 有對應紀錄**
- [ ] 訂單 source = web
- [ ] 留評價 → reviews 表有資料

#### 合作夥伴 × 官網瀏覽器（帳號 #1）
- [ ] Dashboard 顯示「合作後台」分頁
- [ ] /dashboard/partner 五 Tab 切換（概覽/資訊/項目/金流/設定）
- [ ] /dashboard/products 看到自己的商品
- [ ] /dashboard/proposals 提案管理

#### 工作團隊 × 官網瀏覽器（帳號 #2）
- [ ] Dashboard 顯示「工作台」分頁
- [ ] /dashboard/workbench 五 Tab（動態/交接/庫存/考勤/費用）
- [ ] 考勤打卡寫入 DB05
- [ ] 也看得到「個人紀錄」分頁

#### LINE LIFF（任一角色）
- [ ] LINE 開網站 → 隱藏 header/footer
- [ ] Rich Menu 六按鈕全部開對頁面
- [ ] 購物車跨按鈕保留
- [ ] LIFF 下單後 orders.source = liff

#### Telegram Mini App
- [ ] /telegram/workbench 能開
- [ ] 工作台五 Tab 完整
- [ ] orders.source = telegram

#### 發佈流程
- [ ] Notion DB08 發佈一筆觀點 → 30 秒後 /viewpoint-stroll 出現
- [ ] 發佈狀態自動回寫「已發佈」+ 對應連結
- [ ] DB05 改已發佈文章 → 官網更新

---

## 📊 系統架構快速認識

### 資料流
```
Notion（內容來源）→ n8n webhook 同步 → Supabase（查詢+交易）→ Next.js（makesense.ink）
                                                          ↑
                                             (待做：交易回寫 Notion)
```

### n8n 目前狀態（makesense.zeabur.app）
- ✅ 5 個 sync workflow 都有效（DB04/05/06/07/08）
- ✅ Daily sync（每天 8 AM）
- ✅ LINE UID sync
- 🗃️ 6 個舊 WP workflow 已 archived
- 全部 webhook URL 使用 `makesense.zeabur.app`（已脫離 makesense.site）

### 三種入口判斷位置
`components/ui/LayoutShell.tsx` — 根據 URL 參數 `?liff_mode=true` 或路徑 `/telegram/*` 隱藏 header/footer

### 三種會員角色判斷
`lib/auth.ts` + `lib/fetch-all.ts` 的 `checkIsStaff`, `checkIsVendor` — 讀 Notion DB08「關係選項」

---

## 📁 相關檔案與連結

- **GitHub**: https://github.com/jay049Taiwan/makesense-ink (public)
- **線上版**: https://makesense.ink
- **Supabase 專案**: zgwdomvauuxaxtgqqvrn
- **Notion 測試清單**: https://www.notion.so/3479ff25fdab80928c13f02d66634de2
- **Vercel 專案**: makesense-ink (jay049s-projects)
- **n8n**: https://makesense.zeabur.app（47 workflows，其中 sync 相關 active 7 個）

### 本機路徑
- 專案：`/Users/jay049/Documents/工作參考資料/makesense-ink/`（⚠️ 在 iCloud Drive 同步中）
- Python photo_processor：`/Users/jay049/Documents/工作參考資料/photo_processor/`

### 關鍵程式碼位置
- 登入頁：`app/[locale]/login/page.tsx`
- 結帳 API：`app/api/checkout/route.ts`（⚠️ 缺 Notion 回寫、缺扣庫存）
- 單筆同步 API：`app/api/sync/single/route.ts`
- 統一 Supabase 查詢：`lib/fetch-supabase.ts`
- Auth：`lib/auth.ts`（NextAuth Google + LINE）
- i18n routing：`i18n/routing.ts`

---

## 🎯 給下一個 session 的建議優先順序

### Phase 1：完成交易閉環（最重要）
1. 修 `app/api/checkout/route.ts` 加扣庫存 + Notion 回寫
2. 修 `order_items.item_id` 格式 bug（統一成 products.id 或無 dash notion_id）
3. 真實下單一次驗證 Notion 三張表都有紀錄

### Phase 2：內容發佈
4. Noah 批次發佈 50 筆觀點、30 筆合作夥伴
5. 補 events/articles 封面圖（或預設 placeholder）

### Phase 3：角色與入口實測
6. Noah 發佈自己的 DB08 資料，讓角色判斷生效
7. 用 2 組帳號跑完手動測試清單

### Phase 4：對外宣傳前
8. 專案搬出 iCloud（避免幽靈檔案）
9. Google Search Console 提交 sitemap
10. 全面行動裝置測試
