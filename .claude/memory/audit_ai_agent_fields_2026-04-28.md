---
type: project
date: 2026-04-28
topic: notion_ai_agent_fields
originSessionId: 47ca24e6-1af8-40cb-8bf2-db080f8efa4e
---

> ⚠️ **2026/05/09 標註**：此為歷史稽核報告（2026-04-28 ~ 2026-05-05 期間產出）。所述「現行」schema 已於 2026/05/06~05/08 大幅改名（互動選項→互動類別、登記選項→登記類別、文案細項→文案選項、內容選項→素材類別、預約報名→填寫報名、請款請購→紀錄費用、活動細項→活動選項、走讀行旅→導覽走讀、紀錄備項→紀錄細項；DB05 大分類「圖文影音」→「內容素材」）。**僅供歷史脈絡，不要當作現行 schema 依據；現況以 MEMORY.md / makesense-ink/CLAUDE.md 為準**。

---

# AI Agent 欄位調查（2026-04-28）

## 調查方法
透過 Notion MCP 抓 9 個 DB 的 properties schema，搜尋名稱含 `ai` 的欄位，並用 Grep 在 `/Users/jay049/Documents/工作參考資料/` 全域搜尋程式碼引用。

## 結論：每個 DB 都有同一套 AI 欄位（共 14~15 個 / DB）

不是「12 個欄位散落在 9 個 DB」，而是**同一套 14 個欄位被加到 8 個 DB（DB01~DB07, DB09），DB08 少 1 個（無 ai_對應對象）**。
DB07 還多了一個 `ai_對應作者` / `ai_對應發行`（取代 `ai_對應對象`，因為 DB07 是商品庫存，對應作者/發行商更合理）。

### 每個 DB 的 14 欄位標準組合
| 欄位名 | type | 用途推測 |
|---|---|---|
| `ai_meta` | text | 結構化標記（資料類型｜時間｜關聯DB），給 AI 快速理解這筆資料是什麼 |
| `ai_對應對象` | relation → DB08 | AI 自動推論這筆資料應該關聯到誰（人/品牌） |
| `ai_對應標籤` | relation → DB08 | AI 自動推論應該打哪些標籤 |
| `ai企劃` | status (待執行/無執行/完成) | AI agent「企劃」步驟狀態 |
| `ai企劃備註` | text | 企劃過程的 AI 輸出 |
| `ai分析` | status (待分析/無分析/已分析) | AI agent「分析」步驟狀態 |
| `ai分析備註` | text | 分析結果文字 |
| `ai搜查` | status (待搜查/無搜查/已搜查) | AI agent「搜查/檢索」步驟狀態 |
| `ai搜查備註` | text | 檢索到的相關資料 |
| `ai文案` | status (待執行/無執行/完成) | AI agent「文案撰寫」步驟狀態 |
| `ai文案備註` | text | 生成的文案內容 |
| `ai聯想` | status (待執行/無執行/完成) | AI agent「聯想/延伸」步驟狀態 |
| `ai聯想備註` | text | 聯想到的相關概念/連結 |
| `ai進度` | status (待執行/無執行/完成) | AI agent 整體進度狀態 |
| `ai進度備註` | text | 進度相關備註 |

### DB 級差異
- **DB07 庫存控管**：`ai_對應對象` 改名為 `ai_對應作者` + 多一個 `ai_對應發行`（共 15 個 ai 欄位）
- **DB08 關係經營**：沒有 `ai_對應對象`（因為自己就是對象 DB），共 14 個

## 程式碼引用狀況（已接 vs 未接）

### 已接（1 個）：`ai_meta`
- 只在 **photo_processor/** 大量使用（DB05 登記表單寫入時）
- 格式範例：`"成果報告｜2024｜DB05"`、`"行政文書｜2021｜DB05"`
- 主要檔案：
  - `/Users/jay049/Documents/工作參考資料/photo_processor/refine_engine.py`（核心）
  - `/Users/jay049/Documents/工作參考資料/photo_processor/auto_apply_priority.py`
  - `/Users/jay049/Documents/工作參考資料/photo_processor/fix_xingzheng_aimeta.py`
  - `/Users/jay049/Documents/工作參考資料/photo_processor/gen_*_decisions.py`
- 鐵律：「`ai_meta` 覆寫格式 = `[資料類型]｜[執行時間]｜[關聯DB]`」（refine_engine.py:5）
- 注意：Notion 行為 — `ai_meta` 與 `簡介摘要` 不能同一個 patch 一起更新，要分兩次（refine_engine.py:209-212）

### 未接（13 個 / DB，× 8~9 DB ≈ 100+ 欄位空著）
所有 status 類欄位（ai企劃/ai分析/ai搜查/ai文案/ai聯想/ai進度 + 對應備註）+ relation 類欄位（ai_對應對象/標籤/作者/發行）目前都**沒有任何程式碼引用**。
makesense-ink 整個專案 0 引用。

## 設計意圖推測

這套欄位是為「**通用 AI agent 流水線**」預留的。每個工作項目（不管是提案、管考、項目、表單、商品）都會被同一套 6 階段 AI 流程處理：

```
聯想（發想） → 搜查（檢索資料） → 分析（理解現況） → 企劃（產出方案） → 文案（產出文字） → 進度（追蹤完成度）
                                                            ↓
                                              ai_對應對象/標籤（自動分類關聯）
                                              ai_meta（結構化摘要供下次 AI 快速讀）
```

每個階段都有 status 三態（待 / 無 / 已）+ 文字備註，方便 n8n 或 Claude API 用 status 篩選任務、寫回備註。

## 優先建議：先接這 3 個

### 1. `ai_meta`（其實 photo_processor 已有，擴散到其他 DB）
- 已驗證格式有效，最低成本
- 把 `[類型]｜[時間]｜[DB]` 這種一行摘要寫到 DB01/DB02/DB03/DB06，後續任何 AI 工作流第一步都讀這欄就懂上下文
- 立即效益：降低後續所有 AI 任務的 token 用量

### 2. `ai_對應標籤`（DB05/DB06/DB07/DB08）
- 把「該打什麼 hashtag」交給 AI，是最容易做、效益最直接的事
- 跟現有「對應標籤」分開（人工 vs AI 推薦），不會破壞既有資料
- 可走 n8n：Notion trigger（新建頁）→ Claude API → 寫回 `ai_對應標籤`
- 跟 makesense.ink 官網標籤系統可以直接串

### 3. `ai分析` + `ai分析備註`（DB01 資源提案 / DB02 績效管考）
- DB01 已經有 `提煉分析` button + `提案管考摘要` formula，配上 ai 分析就形成完整的「提案進來→AI 自動分析→人工複核」流程
- DB02 同理，AI 先讀 DB03 子項目進度，把摘要寫進 `ai分析備註`，週會直接看
- 對 四九 的價值：每週的管考會議準備時間直接砍半

## 其他觀察

- DB01 有些欄位描述提到 AI：`執行狀態`（DB07）描述為「AI 觸發條件：執行中時可生成草稿」，顯示已有觸發點規劃
- DB07 多個欄位 description 是「Supabase」，代表已對接官網；ai 欄位則是另一條獨立軌道
- DB04（協作交接）的 `ai企劃` 多了一個選項「**待單跑**」（黃色），其他 DB 都沒有 — 推測是 四九 想標記「這個任務 agent 應該獨立跑一次」
