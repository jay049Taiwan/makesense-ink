---
name: 文件對齊稽核 2026-04-29 v2
description: 重新比對本地 .md / Notion 指南頁 vs Notion DB schema 真相（DB04/05/07/08），昨天 04-28 報告已過時。
type: project
date: 2026-04-29
originSessionId: a7d43a70-af42-47c9-9677-a6a2e1de0f31
---

> ⚠️ **[LEGACY]** 2026-04-29 v2 稽核報告，已被 `audit_docs_alignment_2026-04-29_v3.md` 取代。所述「請款請購 / 預約報名 / 文案細項 / 登記選項」等欄位 2026/05/06~05/09 已多輪改名。

# 範圍與方法
- **真相來源**：直接 fetch DB04/DB05/DB07/DB08 collection schema（含所有 select/multi_select/status options）。
- **比對對象**：
  - `/Users/jay049/CLAUDE.md`（工作中控台）
  - `/Users/jay049/Documents/工作參考資料/makesense-ink/CLAUDE.md`（官網）
  - `memory/notion_structure.md`
  - `memory/MEMORY.md`
- **指南頁**：8 個 Notion 指南檔案太大（>200KB），未逐字 fetch；本輪聚焦 DB schema 對齊，指南頁待單獨另查。
- DB04 標題實為 `DB04交接協作`，DB05 為 `DB05登記表單`，DB07 為 `DB07 庫存控管`，DB08 為 `DB08關係經營`（皆與「DB 名稱」對照表一致）。

---

## (a) 嚴重衝突（誤導決策）

### A1. DB04 title 欄位名稱錯誤 — `交接名稱` 不存在
- **真相**：DB04 title 欄位實為 **`協作名稱`**。
- **錯誤位置**：
  - `makesense-ink/CLAUDE.md` L204 「DB04 的 title 欄位叫『交接名稱』」
  - `makesense-ink/CLAUDE.md` L209 同步優先級「主題名稱 > title 欄位（**交接名稱**/表單名稱）」
  - `memory/notion_structure.md` L29 「DB04 協作交接 常用欄位 - **交接名稱**（title）」
- **影響**：任何 sync API / writeback / N8n 寫入 `properties["交接名稱"]` 會 400 報錯。

### A2. DB05 `登記選項` 漏掉「請款請購」
- **真相**：實際 4 個選項 **`請款請購 / 意見回饋 / 紀錄庫存 / 預約報名`**。
- **錯誤位置**：
  - `/Users/jay049/CLAUDE.md` L45 寫「意見回饋 / 紀錄庫存 / 預約報名」
  - `memory/notion_structure.md` L43 同上
- **影響**：庫存異動唯一規則只覆蓋 `紀錄庫存`，但工作台「費用」實際走 `登記選項=請款請購`，不是 `紀錄備項`／`請款請購` select。文件描述工作台 cascade 機制和 staff-helper 寫入時要對得起來。

### A3. DB05 沒有「文書類型」欄位 — 實際叫「文書備項」
- **真相**：欄位名 **`文書備項`**，選項：`新聞稿 / 提案申請 / 成果報告 / 報價報表 / 憑證文件 / 公文`。
- **錯誤位置**：
  - `/Users/jay049/CLAUDE.md` L49 寫「文書類型（select）：提案申請 / 成果報告 / 報價報表 / 憑證文件 / 公文」（缺「新聞稿」）
- **影響**：寫入 properties["文書類型"] 直接錯。

### A4. DB05 `文案細項` 選項表已大改
- **真相**：`論述發想 / 腳本企劃 / 訪查調研 / 簡報圖文 / 官網內容 / 網頁社群 / 行政文書`（7 項）。
- **錯誤位置**：
  - `/Users/jay049/CLAUDE.md` L48 寫「官網內容 / 訪查調研 / 新聞報導 / 網頁社群 / 腳本教案 / 論述發想 / 簡報圖文 / 出版品 / 行政文書」
  - 差異：**多寫了「新聞報導 / 出版品」（不存在）**、**「腳本教案」實名「腳本企劃」**。
- **影響**：官網 Footer 上半部依靠 `文案細項=官網內容` 篩選（makesense-ink/CLAUDE.md L86）— 這條仍然正確；但其他 select 值寫入會錯。

### A5. notion_structure.md DB05 `聯繫細項` 與真相錯位
- **真相**：DB05 `聯繫細項` 不存在；最接近的是 `聯繫細項`… 實際 DB05 schema 只有 select `聯繫細項: 邀請委託/產品銷售/提醒通知`（其實有！我的 dump 中其實**沒看到** `聯繫細項`，只有 `通知細項`、`互動選項`）。
  - 正確 DB05 select 中有 `通知細項`（受理通知/審核不通過通知/行前通知/意見回饋邀請通知/收費確認通知）但**沒有 `聯繫細項`**。
- **錯誤位置**：`memory/notion_structure.md` L46「聯繫細項（select）：邀請委託 / 產品銷售 / 提醒通知」— **此欄位在 DB05 schema 中不存在**。
- **影響**：依此寫入 N8n 流程會 400。建議刪除或改名。

### A6. notion_structure.md `DB05 互動選項` 沒問題；但 `DB06 互動選項` 描述需驗證
- DB06 未在本輪 fetch — 暫列「待驗證」，但 notion_structure.md L62「DB06 互動選項：內部共識 / 聯繫互動 / 行政事務」與 DB05 互動選項（內部共識/外部聯繫）不同需另查 DB06 確認。

---

## (b) 命名差異（不致命，但需校正）

### B1. DB04 `距離(km)` 實名 `距離km`（無括號）
- `memory/notion_structure.md` L37 寫「距離(km)」
- `MEMORY.md` 多處引用一致地寫 `距離km` — 兩邊不一致。

### B2. DB04 `單價` 欄位多義
- 真相：DB04 number 欄位有 `實際單價 / 預計單價 / 建議售價`，沒有單純叫「單價」的欄位。
- `memory/MEMORY.md` 「DB04 協作交接 - 單價（number）」
- `/Users/jay049/CLAUDE.md` 未提，但 `makesense-ink/CLAUDE.md` L226「單價（number；DB04 活動）」 — 兩文件都模糊。

### B3. DB04 `執行時間` ✓（仍對）；`對應辦理單位` relation ✓（schema 中有）。

### B4. DB07 schema 完整對齊
- `商品選項` = 選書/選物/數位 ✓
- `數位細項` = 內容/貼圖/票券 ✓
- `庫存類型` = 商品/耗材/設備 ✓
- `頁面狀態` = 有頁面/無頁面/無狀態 ✓（status 欄位）
- `進貨屬性` = 自營產品/批售產品/聯名產品/其他 — 仍存在（雖 makesense-ink/CLAUDE.md L368 已說「不再用進貨屬性，改用 publisher_id」， schema 沒清掉，需澄清）

### B5. DB08 schema 完整對齊
- `經營類型` = 觀點/標籤/紀錄 ✓
- `關係選項` = 合作夥伴/個人/工作團隊 ✓（順序不同但內容齊）
- `會員狀態` = **會員 / 無會員 / 非會員**（status，3 階）— 文件多處只提到「會員狀態=會員」，未說明還有「無會員/非會員」分支
- `自對標籤` ✓
- `通知偏好` (一般會員/合作廠商) — 全部本地文件未提及，但這是「待開發審核通知系統」要用的選項候選 — 建議補入 MEMORY.md。

### B6. DB05 `紀錄備項` 順序
- 真相：`打卡紀錄 / 加班紀錄 / 請假紀錄 / 搜查彙報 / 會議討論 / 工作紀錄`
- `makesense-ink/CLAUDE.md` L465「打卡紀錄 / 加班紀錄 / 請假紀錄 / 工作紀錄 / 搜查彙報 / 會議討論」— 順序不同（工作紀錄被前移）；**選項名稱本身一致** ✓。

### B7. DB05 `請款請購` 選項
- 真相：`請購直匯 / 請款轉交`（select）
- `makesense-ink/CLAUDE.md` L466 ✓
- 但 A2 同時揭示：`登記選項` 也有 `請款請購` 值 — 兩層欄位（select『登記選項』與 select『請款請購』）並存，文件須區分清楚。

---

## (c) 缺漏（schema 中存在但本地未提及）

1. **DB04**：select 共 55 個、multi_select 16 個、status 36 個。本地 notion_structure.md L29-37 只列 6 個欄位。明顯不完整 — 但這是合理的（只列常用），需在頁首加一句「以下為常用，完整 schema 見 Notion」。
2. **DB05**：select 58 個、status 29 個 — 本地只列 ~12 個。同上，需聲明「常用集」。
3. **DB05 `下架備項`、`場地租借`、`官網備項`、`委託邀請`、`憑證備項`** 等是工作台和市集流程必用，但本地 .md 完全未列。`官網備項` 已在 makesense-ink/CLAUDE.md L86 引用，但選項清單未列出。
4. **DB05 `付款方式`**：`無付款 / 現金 / 轉帳匯款 / 信用卡 / 其他 / 文化幣 / LINE PAY` — checkout 流程相關，但 `makesense-ink/CLAUDE.md` 只說「到門市現場付現」。
5. **DB07 `推廣狀態` (未開始/推廣中/已推廣)**：合作後台「商品管理」可能用得上，但本地未提。
6. **DB08 `通知偏好` (一般會員/合作廠商)**：對接「待開發審核通知系統」非常相關，缺漏。
7. **DB05 status `登記發佈`**：除了 `發佈狀態`(已發佈/無發佈/待發佈) 之外，DB05 還有獨立的 `登記發佈`(已發佈/不發佈/待發佈) — 兩個發佈欄位並存，本地文件僅描述 `發佈狀態`。
8. **DB08 `對應地點協作`、`對應講師協作`、`對應造訪動機`** 三個 relation → DB04 — 描述官網「帶路老師」「講師」「造訪動機」資料來源時可用，本地 schema 文件未列。

---

## (d) 待清查事項

- **Discord 殘留**：本輪檢查的 4 個 .md 中，Discord 提及只剩於合理位置：
  - `/Users/jay049/CLAUDE.md` L6（Discord Owner ID 參考）、L10（已退役聲明）、L107-108（已停用清單）— **OK，不需動**。
  - `MEMORY.md` 無 Discord 殘留 ✓。
  - `notion_structure.md` 無 ✓。
  - `makesense-ink/CLAUDE.md` 無 ✓。
- **WP makesense.site 退役**：4 個 .md 全部清完，僅 `makesense-ink/CLAUDE.md` L457「舊站 makesense.site 已退役，不再維護」— OK 是退役聲明 ✓。`/Users/jay049/CLAUDE.md` L90 同樣是退役聲明 ✓。
- **指南頁（8 份）**：本輪未抓內文逐字比對。建議下一輪稽核專做指南頁，因為各份 >50KB，須分段。

---

## (d) 建議更新動作清單

依嚴重程度排序：

| # | 動作 | 檔案 | 行 | 說明 |
|---|------|------|-----|------|
| 1 | 改 `交接名稱` → `協作名稱` | makesense-ink/CLAUDE.md | L204, L209 | DB04 title 真實名稱 |
| 2 | 改 `交接名稱` → `協作名稱` | memory/notion_structure.md | L29 | 同上 |
| 3 | DB05 `登記選項` 補 `請款請購` | /Users/jay049/CLAUDE.md | L45 | 改成 4 選項 |
| 4 | DB05 `登記選項` 補 `請款請購` | memory/notion_structure.md | L43 | 同上 |
| 5 | DB05 `文書類型` → `文書備項`、補「新聞稿」 | /Users/jay049/CLAUDE.md | L49 | 欄位實名與選項齊全 |
| 6 | DB05 `文案細項` 砍掉「新聞報導/出版品」、改「腳本教案→腳本企劃」 | /Users/jay049/CLAUDE.md | L48 | 真相 7 項 |
| 7 | DB05 `聯繫細項` 確認是否真存在；若否，刪除 | memory/notion_structure.md | L46 | schema dump 中未見 |
| 8 | DB04 `距離(km)` → `距離km` | memory/notion_structure.md | L37 | 實際無括號 |
| 9 | DB04 `單價` 寫清楚是 `實際單價/預計單價/建議售價` 哪一個 | makesense-ink/CLAUDE.md, MEMORY.md | — | 避免歧義 |
| 10 | DB05 列出 `紀錄備項` 標準順序（與 schema 一致） | makesense-ink/CLAUDE.md | L465 | 順序一致 |
| 11 | DB08 `會員狀態` 補「無會員/非會員」分支說明 | MEMORY.md DB08 區 | — | 完整 status |
| 12 | DB08 補 `通知偏好` 欄位（一般會員/合作廠商） | MEMORY.md「待開發審核通知系統」區 | — | 對接通知設計 |
| 13 | DB07 `進貨屬性` 標註「schema 仍存在但同步邏輯已改用 publisher_id」 | makesense-ink/CLAUDE.md L367-371 周邊 | — | 防誤用 |
| 14 | DB05 `登記發佈` vs `發佈狀態` 兩欄位差異補一句 | notion_structure.md | — | DB05 兩個發佈欄位 |
| 15 | DB06 schema 本輪未 fetch — 排程下輪 | — | — | 待驗 |
| 16 | 8 份 Notion 指南頁本輪未 fetch — 排程下輪 | — | — | 太大需分段 |

---

## 摘要結論

- DB05/DB07/DB08 schema 大致與本地文件一致。
- **3 條最嚴重衝突會導致實寫 Notion API 報錯**：A1（DB04 title 名）、A2（登記選項缺請款請購）、A3（文書類型欄位實名）。
- A4（文案細項選項變動）對 sync 流程影響中等；A5（聯繫細項可能不存在）需手動到 Notion 二次確認。
- 整體建議：以本檔的「動作清單」為下一輪 patch 依據，先改 4 個本地 .md，再排程 fetch 8 份 Notion 指南做第二輪。
