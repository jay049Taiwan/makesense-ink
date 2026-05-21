> ⚠️ **2026/05/09 標註**：此為歷史稽核報告（2026-04-28 ~ 2026-05-05 期間產出）。所述「現行」schema 已於 2026/05/06~05/08 大幅改名（互動選項→互動類別、登記選項→登記類別、文案細項→文案選項、內容選項→素材類別、預約報名→填寫報名、請款請購→紀錄費用、活動細項→活動選項、走讀行旅→導覽走讀、紀錄備項→紀錄細項；DB05 大分類「圖文影音」→「內容素材」）。**僅供歷史脈絡，不要當作現行 schema 依據；現況以 MEMORY.md / makesense-ink/CLAUDE.md 為準**。

---

# Page Template 稽核報告 2026-05-05

## 執行狀況：未完成（工具能力受限）

### 限制
1. Notion MCP `fetch` 對 collection 只回傳 `default_page_template`（單一 URL），**無 page_templates 陣列**。要列每個 DB 的全部 templates，需透過 Notion UI 或未公開 API。
2. DB04 / DB05 / DB06 / DB08 的 collection schema fetch 結果分別 210K / 201K / 167K / 82K 字元，**超過單次 token 上限**，連基本 schema 都被截斷成檔案 dump，難以系統性逐一比對。
3. 沒有「list templates by collection」的 MCP 工具。

### 已成功 fetch 的 DB schema（僅 default_page_template）
| DB | default_page_template URL |
|----|---------------------------|
| DB01 資源提案 | https://www.notion.so/16fa25096fab4f7d85b5cfb2cc494a97 |
| DB02 績效管考 | https://www.notion.so/14abed4623d146c68d63586762e8d771 |
| DB03 項目進度 | https://www.notion.so/4b1a7508e72a4eb6bee5d405e1d7b7d3 |
| DB07 庫存控管 | https://www.notion.so/1faf9b7527c748928e83e3137c29fdf4 |
| DB09 日期紀錄 | https://www.notion.so/9b3a9d183d7a44e487c067c674e14e04 |

DB04/DB05/DB06/DB08 schema 因 token 超限，存於：
- `/Users/jay049/.claude/projects/-Users-jay049-Documents-------/a7d43a70-af42-47c9-9677-a6a2e1de0f31/tool-results/mcp-73449d04-01f2-4d79-b0b5-908d1d64b42d-fetch-1777956050475.txt` (DB04)
- 同目錄 -1777956054373.txt (DB05)
- 同目錄 -1777956058224.txt (DB06)
- 同目錄 -1777956065795.txt (DB08)

### 從 schema 已可確認的現行欄位名（供 template 比對基準）
- DB01：title=專案名稱；提案類型 / 參與屬性 / 執行狀態 / 封存狀態 / 檢核狀態
- DB02：title=管考名稱；管考類型（對應民間/對應公部門/對應自提）；執行狀態（執行中/未執行/已完成）
- DB03：title=項目名稱；項目類型（自辦/委外）；執行狀態（執行中/已預定/已完成）
- DB07：title=庫存名稱；商品選項（選書/選物/數位）；庫存類型（商品/耗材/設備）；耗材選項；數位細項；選書細項；選物細項；頁面狀態
- DB09：title=紀錄名稱；紀錄類型（Day/Week/Month/Season/Year/歷史事件）

### DB07 schema 觀察（即時稽核發現）
- 仍存在欄位：`屬性標記`（→ 舊 collection `3b455c28-...`），description 標 "無關零售預計取消"，建議真的清掉
- `首發年份` select 死寫 2014–2024，description 已自註「改用 formula 來計算年份，或整併」
- `成品尺寸` 仍有範例值「長18cm寬80cm高9cm（範例）」殘留
- `辦公設備屬性` 與 `餐飲設備屬性` 兩個 select 選項完全相同（3C家電/佈置收藏/餐具）— 重複定義
- `主要材質` multi_select 仍是 demo 級小清單（木質材料/紙/陶/布/銀/玻璃）

### 已確認題目所給的「重點錯字」核對結果
無法在現有 schema 中發現以下舊名（表示 schema 層面已校正完畢）：
- 文書類型 / 異動類型 / 登記類型 / 交接名稱 / 活動類型 / 主題策展
- 工作項目進度 / 共識交接協作 / 登記表單明細 / 庫存資產 / 範圍日期（DB 名）

但 **page_template 內部** 的預設 select 值與內文無法在此次稽核中被檢查 — 需另一個能列 templates 的工具或人工進入 Notion 比對。

## 建議下一步
1. 由 四九 在 Notion 各 DB 點開「Templates」清單，把每個 template URL 貼出來給 Claude，再 fetch 個別 page。
2. 或開發 n8n flow 用 Notion API 直接列 collection 的 page_templates 子集合。
3. DB07 schema 層面的清理（屬性標記/首發年份/成品尺寸範例/辦公-餐飲設備屬性合併）可獨立處理。

## 修了 0 處（受限於工具）
