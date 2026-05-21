> ⚠️ **[LEGACY]** 本文件為 makesense.site（WP 舊站）的 /market-booking/ 頁面進度。WP 舊站已於 2026/04 退役，內容僅供參考歷史。

# 展售合作頁面（/market-booking/）開發進度

## 最後更新：2026-04-07

## 已完成

### 1. SP-BK0 合併（v2.0.0）
- 合併原 SP-BK0 + SP-BK0b 為一個 snippet
- 包含：booking post type、`/booking/full` API、市集場次 GET/PUT、空間封鎖日期、WC 金流橋接、後台 meta box
- PUT `/booking/market-dates` 端點：n8n 或手動推送市集場次資料
- 認證方式：`manage_options` 權限 或 Bearer token（`ms_sync_api_key` option）
- 本地檔案：`dashboard-snippets/SP-BK0_booking_api.php`

### 2. SP-BK1v4 更新（v4.1.0）
- 從硬編碼 `$groups` 改為讀 `get_option('ms_market_dates')`
- 表單改為完整版（攤位類型、品牌資訊、桌椅電源租借、費用同意等）
- 送出走 `/booking/full` API + WC 付款導向（product ID: 3095）
- 本地檔案：`dashboard-snippets/SP-BK1v4_market_booking.php`

### 3. CAL-CORE 更新（v2.3）
- 新增 `MS_MKT` 全域變數（PHP 在 wp_head 輸出，從 `ms_market_dates` option 讀取）
- `rewriteMarketCal()` 改為直接讀 `MS_MKT`，不再解析 onclick 屬性
- 市集日格子顯示：日期數字 + 主題名稱（可點擊）
- 已過期日期也可點擊（連到報名頁顯示「已結束」告示）
- 新增 `.ms-mkt-past` CSS 類別
- 本地檔案：`dashboard-snippets/CAL-CORE_calendar.php`

### 4. WP API Key 設定
- `ms_sync_api_key` = `ms-sync-2026-makesense`（已設定）

### 5. 市集場次資料已推送
- 用 curl PUT 手動推送 4 場森本集市到 `ms_market_dates`：
  - 01場：2026-04-03 ~ 04-05（已過期）
  - 02場：2026-05-01 ~ 05-03
  - 03場：2026-05-09 ~ 05-10
  - 04場：2026-06-19 ~ 06-21
- API 驗證：`GET /wp-json/makesense/v1/booking/market-dates` 回傳正確

### 6. n8n Workflow 已建立（但未啟用）
- 名稱：「DB04 園遊市集 → WP 市集場次同步」
- ID：`bdRR8JqVzo727Zih`
- 問題：Zeabur 的 gateway timeout（DB04 資料量太大，查詢逾時）
- 暫時用手動 curl 推送替代

## 待處理（下次 session）

### 優先：DB04 → WP 同步鏈修復
1. **Notion DB04**：5 場森本集市的「活動類型」欄位要改成「園遊市集」（目前是「藝文表演」或未設定）
2. **Notion DB04**：「發佈更新」按鈕的 webhook URL 是空的，要填入 `https://n8n.makesense.site/webhook/db04-event-sync`
3. **n8n**：停用「DB04_to_WP_Events」（舊版 v1），只保留「DB04活動→WP活動+WC商品同步 v2」
4. **n8n**：觸發同步後，WP 會建立 TEC 活動頁面 + WC 商品
5. **行事曆連結**：改為指向 TEC 活動頁面（而不是 `/market-booking/?date=`）

### 內容呈現
6. **已結束活動**：點擊後顯示心得回饋文
   - DB05 新增「社群備項」select 欄位，選項包含「回顧分享」
   - SP-BK1v4 讀取 DB05 中 `對應協作=該場市集` + `社群備項=回顧分享` 的內容
7. **未結束活動**：點擊後顯示宣傳文案 + 報名表單
8. **文案撰寫指南**：目前沒有「心得回饋文」類別，需新增

### 樣式修復
9. **CAL-CORE CSS 優先級**：市集日的橘色背景被週末 `nth-child` 紅棕色蓋掉，需要提高市集日 CSS 的優先級

## n8n Workflow 整理

| 名稱 | 狀態 | 建議 |
|------|------|------|
| DB04_to_WP_Events | ✅ 啟用 | → 停用（被 v2 取代） |
| DB04活動→WP活動+WC商品同步 v2 | ✅ 啟用 | 保留，webhook: `db04-event-sync` |
| DB04 批次活動同步到 WP | ❌ 停用 | 保留停用（需要時手動跑） |
| WC訂單完成→DB05活動報名記錄 | ✅ 啟用 | 不動 |
| DB04 園遊市集 → WP 市集場次同步 | ❌ 停用 | 超時問題待解 |

## 相關欄位對照

| 用途 | DB04 欄位名 | 類型 |
|------|-----------|------|
| 活動標題 | 主題名稱 | rich_text |
| 活動日期 | 執行時間（date:執行時間:start/end）| date |
| 活動類型 | 活動類型 | select（含「園遊市集」選項）|
| 發佈狀態 | 登記發佈 | status（不是 select！）|
| 同步狀態 | Status | select |
