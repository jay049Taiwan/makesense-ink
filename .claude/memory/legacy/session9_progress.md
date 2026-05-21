---
name: Vercel架站（九）session 進度
description: 2026/04/15 完成的所有工作項目，供下一個 session 接手
type: project
originSessionId: bb452dd1-ceac-4cc1-83e4-aa966b9112aa
---

> ⚠️ **[LEGACY]** Session 9 歷史進度紀錄。所述「表單類型 / 登記選項」等欄位 2026/05/06 起已大改名（現為 內容類型 / 登記類別）。僅供當時脈絡，不要當作現行依據。

> ⚠️ **2026/04/22 修正**：本文件 L30 原先記錄的庫存批次判斷邏輯**錯了**，已更正。
> 正確規則（四九 2026/04/22 定案）：
> **DB05 表單類型=報名登記 + 登記選項=紀錄庫存 + 庫存細項=進貨/出貨/盤點**
> → 對應明細 → **DB06 明細類型=庫存紀錄** + 對應庫存 → **DB07**
> 客戶訂購訂單（出貨）走同一套，不另闢路徑。
> 舊說法「共識互動+庫存選項有值」「互動選項=紀錄庫存」**都是錯的**。

## 2026/04/15 Session 9 完成項目

### 多語言系統（中英日韓）
- next-intl 整合，路徑式 URL（/en/, /ja/, /ko/）
- 瀏覽器語言自動偵測 + Cookie 記住
- 4 語言翻譯檔 messages/zh|en|ja|ko.json
- Header 語言切換器（🌐）
- SEO 多語言（hreflang, metadata）
- Supabase translations 表 + Claude Haiku 自動翻譯

### 發佈/下架流程
- 待發佈 → 同步到 Supabase（active）→ 回寫「已發佈」+ URL
- 已發佈 → 更新內容
- 無發佈 → 下架（draft）→ 回寫「待發佈」
- 回寫用 fetch 直接呼叫 Notion REST API（繞過 SDK）
- maxDuration = 300 秒（Pro 方案）
- **DB04 注意**：曾有 Notion automation 把發佈狀態改回待發佈，已刪除
- **DB04 注意**：舊的 WP 同步 workflow（6R6rFJF3Iz90vIVm）已關閉

### 商品庫存邏輯
- 庫存 > 0：主動顯示在列表/推薦區
- 庫存 = 0：只出現在搜尋和觀點頁，商品頁顯示紅色「無庫存」色塊
- DB06 進貨/出貨/盤點直接更新 Supabase products.stock
- DB05 庫存批次（2026/04/22 更正版）：**表單類型=報名登記 + 登記選項=紀錄庫存 + 庫存細項=進貨/出貨/盤點** → 對應明細 → DB06（明細類型=庫存紀錄、對應庫存→DB07）
- DB07 的 formula「庫存總計」不再使用，改由 DB06 直接控制

### 假資料清除
- /sense 假統計和假歷史全部移除，改為 Supabase 即時計算
- 工作台假任務/假通知/假打卡全部移除，改接 Supabase
- Supabase 所有非已發佈資料已標為 draft

### 頁面修正
- 俱樂部「近期活動」改用 events（原本錯用 articles）
- 俱樂部「地方通訊」改用 articles（原本錯用 tags）
- 文章無封面圖時不顯示 placeholder
- Notion blocks→HTML 排版改善（換行/列表/空段落）
- 過期活動隱藏購票，顯示「敲碗再辦」按鈕 + 聯絡表單
- 敲碗計數器（encore_requests 表）
- 商品頁新增相關觀點和相關文章區塊

### n8n workflow 全部改為立刻回應
- DB04 Event Sync: responseMode=onReceived
- DB05 Article Sync: responseMode=onReceived
- DB06 Transaction Sync: responseMode=onReceived
- DB07 Product Sync: responseMode=onReceived
- DB08 Relation Sync: responseMode=onReceived
- 舊 WP 同步 workflow（DB04活動→WP）已關閉

### LINE 整合（程式碼完成，待驗證）
- 交接文件在 line_integration_handoff.md

### 待處理項目（下個 session）
1. LINE 功能驗證和完善
2. 「你應該會關注」加按鈕（跟「你可能也喜歡」一樣）
3. DB05 庫存批次功能測試
4. footer 文案內容確認
5. 觀點（DB08）發佈測試
6. 敲碗表單自動填入會員資訊（已部署，待確認）
