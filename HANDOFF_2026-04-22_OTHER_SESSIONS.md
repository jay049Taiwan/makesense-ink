# 2026/04/22 DB07/DB08 Schema 變動 — 其他 session 要處理的部分

## 背景

Noah 於 2026/04/22 對 Notion DB07、DB08 做了結構重整。**makesense-ink 官網 repo 的部分已處理完畢**（見 PR #2：https://github.com/jay049Taiwan/makesense-ink/pull/2）。

此文件列出**不在 makesense-ink PR scope 內、需要其他 session 處理**的項目。請直接領取其中一區開工。

---

## Schema 變動速查表（所有 session 通用）

### DB08 關係經營 — 核心變動
- **經營類型（select）舊選項已廢**：連結對象 / 主題標籤 / 標籤觀點
- **新選項**：觀點 / 標籤 / 紀錄
- **對象選項 → 關係選項**（欄位改名，選項不變：個人 / 合作夥伴 / 工作團隊）
- **已刪除欄位**：觀點層級、觀點狀態、標籤狀態、個人細項
- **觀點區域 → 行政區域**

### DB07 庫存資產
- **商品選項 select 縮減為 3 個**：選書 / 選物 / 數位（舊的 票券 / 獎禮品 / 加購折價 已移除）
- **欄位改名**：
  - 選書備項 → 選書細項
  - 選物備項 → 選物細項
  - 數位選項 → 數位細項（選項：內容 / 貼圖 / 票券）
  - 加購贈品 → 獎禮贈品
- **頁面狀態（status）**：有頁面 / 無狀態 / 無頁面（新增）
- **新增 ai_對應作者 / ai_對應標籤 / ai_對應發行**（relation → DB08）

### DB04 活動
- **實際單價 / 預計單價 → 單價**（合併成一欄）

### DB05 登記表單明細
- 「互動選項=紀錄庫存」的庫存批次判斷，改用「庫存選項」是否有值來判斷（進貨/出貨/盤點）

### 同步規則（makesense-ink 已實作，僅供參考理解設計意圖）
| Supabase 表 | DB08 過濾條件 |
|---|---|
| topics | 經營類型 IN (觀點, 標籤) |
| persons | 會員狀態=會員 AND 關係選項=個人 |
| partners | 會員狀態=會員 AND 關係選項=合作夥伴 |
| staff | 會員狀態=會員 AND 關係選項=工作團隊 |
| members | 會員狀態=會員（email 主鍵） |

---

## 🟢 區塊 A：brand_monitor 專案（Python repo）

**Repo**: `/Users/jay049/Documents/工作參考資料/brand_monitor`
**語言**: Python
**優先級**: 高（這個專案會自動寫入 DB08，寫錯會靜默失敗 → 新會員/標案資料同步不進 Notion）

### 要改的檔案

**`notion/db08.py`**
- 所有 `經營類型: {select: {name: "連結對象"}}` → 依業務語意改為 `"紀錄"` 或 `"標籤"`
- 所有 `經營類型: {select: {name: "主題標籤"}}` → 改為 `"標籤"` 或 `"觀點"`（看原意）
- `load_keywords()` filter `經營類型 = 主題標籤` → 改為 `or: [經營類型=觀點, 經營類型=標籤]`
- 任何寫入 `"對象選項"` → 改為 `"關係選項"`
- L26、L30 的註解同步更新

### 驗收
- `python3 -m py_compile notion/*.py` 語法通過
- 觀察 log 確認至少跑過一次自動標案寫入，沒有被 Notion API reject

---

## 🟢 區塊 B：photo_processor 專案（Python repo）

**Repo**: `/Users/jay049/Documents/工作參考資料/photo_processor`
**優先級**: 中（影響 AI 辨識說明、不直接寫入錯誤）

### 要改的檔案

**`refine_auto.py`**
- `SYSTEM_PROMPT` 中「經營類型：連結對象/標籤觀點」段落 → 全部改為「觀點/標籤/紀錄」

**`discord_bot.py`**（若還在用）
- `_SUMMARY_PROPS` 若列「觀點層級」→ 改「經營類型」

---

## 🟢 區塊 C：staff-portal 專案（Node.js repo）

**Repo**: `/Users/jay049/Documents/工作參考資料/staff-portal`
**優先級**: 高（staff 登入驗證用這個）

### 要改的檔案

**`server/routes/auth.js`**
- 查 DB08 的 `對象選項=工作團隊` filter → 改為
  ```
  and: [
    { property: "會員狀態", status: { equals: "會員" } },
    { property: "關係選項", select: { equals: "工作團隊" } }
  ]
  ```

---

## 🟡 區塊 D：n8n workflows 排查（Zeabur n8n instance）

**n8n URL**: https://makesense.zeabur.app
**MCP 可用**: 透過 `mcp__a7fc8d57-4921-4104-b7bd-d05f8990caea__*` 工具系列

### 要檢查的 workflow（依優先級排序）

**🔴 必改（寫入 DB08 新會員/客戶）**
- `WF_WC_Customer_to_Notion` — 新會員寫入 DB08：檢查 `經營類型` 寫入值、`對象選項` → `關係選項`、加上 `會員狀態=會員` 設定

**🟡 中優先（查詢 DB08）**
- `WF_LINE_UID_Sync`（ID: `QHA6V6ZEvsBvSJQo`）— 查 DB08 by Email，filter 需確認
- `WF_LINE_Order_Notify` — 查 DB08
- `WF_LINE_Admission_Notify` — 查 DB08
- `WF_WC_Order_to_DB05_報名回寫` — 有 DB08 寫入
- `Notion DB08 Relation Sync`（ID: `TAJsoER7arvsN0xE`）— 同步觸發邏輯

### 🚨 已知坑
- MCP 的 `update_workflow` 會讓 HTTP Request node 的 credentials 失去綁定 → 每個 workflow 改完要**手動到 n8n UI 重選 "Notion account"**
- 正確的 Notion credential ID 在建 workflow 時用 `newCredential('Notion account')` 會只建 placeholder，最終仍需手動 UI 綁定

### 驗收
- 每個 workflow publish + 手動測試一筆

---

## 🟡 區塊 E：Notion 指南更新（6 份 Notion 頁面）

**優先級**: 低（純文件，不影響程式）但會長期誤導 AI

### 必修（整篇重寫相關段落）

**資料庫類別指南**（`3279ff25fdab80a18fffff56c578a86a`）
- DB06-DB08 編號全錯亂（請交叉比對 CLAUDE.md 的正確編號）
- DB07 商品選項新清單（3 個）
- DB08 經營類型新選項
- DB05 「大分類」欄位過時說明
- 刪除「觀點層級」「觀點狀態」「標籤狀態」說明

**官網維護指南**（`32c9ff25fdab81389368eac6f77bc417`）
- 4.4 persons、4.5 topics 篩選條件按新 schema
- 同步回寫規則 tag_type 映射邏輯

**官網內容撰寫指南**（`3329ff25fdab8017b9a3eae1fb7fb5a2`）
- 觀點漫遊 DB08 來源說明

### 小修

**系統總論指南**（`2869ff25fdab80c6a266f1228f8bd587`）
- Discord Bot 段已過時（改用 Telegram Bot）

**圖像製作指南**（`3299ff25fdab8040bcaad28122bebff8`）
- Step 5 建立 DB08 頁面的「經營類型」值（原「連結對象」改「紀錄」）

**文案撰寫指南**（`3279ff25fdab80aaa42be8d6dd91daed`）
- 文書類型「四個 vs 五個」不一致問題

---

## 🟡 區塊 F：本地 memory 檔案 + 殘留計畫

**位置**: `~/.claude/projects/-Users-jay049-Documents-------/memory/`
**優先級**: 低（Noah 個人記憶檔，純文件）

### 必修
- `notion_structure.md` — DB08 結構大改、DB07 欄位改名
- `makesense_ink_vision.md` L10 「個人細項」→「關係選項」
- `brand_monitor_progress.md` — 全文「主題標籤」替換為「觀點/標籤」
- `onedrive_photo_migration.md` L25 「連結對象」更新
- `MEMORY.md` — 補 2026/04/22 變動摘要（Noah 記憶檔索引入口）

### 建議標記為 LEGACY（內容過時但保留）
- `ticket_product_model.md`（「票券=DB07 sub_category」已不成立）
- `calendar_unified_spec.md`
- `makesense_ink_routing.md`
- WP 舊站文件 5 份
- `.claude/plans/nested-sauteeing-minsky.md`（若存在）

---

## 🟢 區塊 G：Supabase schema 設計討論（建議但不緊急）

**優先級**: 低

另一個 session 建議新增 `products.detail_category` 欄位存 DB07「選書細項/選物細項/數位細項」，讓官網能區分「數位/票券」vs「數位/貼圖」。

**目前評估**：前端沒有「按數位細項篩選」的需求，加了沒用。**建議暫不做**，等有具體前端需求再擴充。

---

## 🚨 總原則

1. **不要修 makesense-ink 內的程式碼**（已在 PR #2 處理完，重複修會衝突）
2. 其他 repo 請各自開 commit / PR（如果有 git）
3. 改完請驗證基本編譯/語法通過
4. 所有 session 都可以查 `makesense-ink/CLAUDE.md` 看最新 DB schema 說明

---

## 建議執行順序

**Phase 1（一週內）**：
- 區塊 A（brand_monitor）— 避免新標案寫不進 DB08
- 區塊 C（staff-portal）— 避免 staff 登入驗證壞
- 區塊 D 的 WF_WC_Customer_to_Notion — 避免新會員寫不進 DB08

**Phase 2（兩週內）**：
- 區塊 B（photo_processor）
- 區塊 D 其他 workflow
- 區塊 E 的 3 份必修 Notion 指南

**Phase 3（有空就做）**：
- 區塊 F memory 檔
- 區塊 E 的小修
- 區塊 G（暫不做）
