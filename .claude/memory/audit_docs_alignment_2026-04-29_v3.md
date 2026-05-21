---
type: project
title: 文件對齊稽核 v3（含 custom skill 比對）
date: 2026-04-29
supersedes: audit_docs_alignment_2026-04-28.md（v2）
scope: 本地 4 份 .md + custom skills (~/.claude/skills/) + 對 Notion 指南（待 Notion fetch 補完）
originSessionId: a7d43a70-af42-47c9-9677-a6a2e1de0f31
---

> ⚠️ **2026/05/09 標註**：此為歷史稽核報告（2026-04-28 ~ 2026-05-05 期間產出）。所述「現行」schema 已於 2026/05/06~05/08 大幅改名（互動選項→互動類別、登記選項→登記類別、文案細項→文案選項、內容選項→素材類別、預約報名→填寫報名、請款請購→紀錄費用、活動細項→活動選項、走讀行旅→導覽走讀、紀錄備項→紀錄細項；DB05 大分類「圖文影音」→「內容素材」）。**僅供歷史脈絡，不要當作現行 schema 依據；現況以 MEMORY.md / makesense-ink/CLAUDE.md 為準**。

---

# 文件對齊稽核 v3 — 2026-04-29

## 比對範圍實際完成度
| 維度 | 狀態 | 備註 |
|------|------|------|
| A. 本地 4 份 .md 互比 | 已完成 | CLAUDE.md（global）、makesense-ink/CLAUDE.md、notion_structure.md、MEMORY.md |
| C. Custom skill (~/.claude/skills/) | 已完成 | 只有 2 份：`n8n-makesense.md`、`makesense-web-LEGACY.md`；`~/.claude/agents/` 不存在；`/Users/jay049/Documents/工作參考資料/.claude/` 與 `makesense-ink/.claude/` 也無 agents/skills 目錄 |
| D. Routine instruction（Claude.app） | 無法直讀，採前次 audit 報告交叉 | 略 |
| B. Notion 指南頁（8 份） | **未在本回合完成** | 需 Notion MCP fetch；本回合先以「已知今天剛改」清單交叉本地 .md，未實際拉指南頁 raw |

---

## 嚴重度三級

### 🔴 P0（會誤導後續 workflow / 同步、必須立刻修）

**P0-1（custom skill）n8n-makesense.md description 仍用舊 DB 短名**
- 位置：`/Users/jay049/.claude/skills/n8n-makesense.md` line 9
- 寫的：「DB01~DB09（資源提案、績效管考、**工作項目進度**、**共識交接協作**、**登記表單明細**、進銷明細、**庫存資產**、關係經營、**範圍日期**）」
- 應為（依 CLAUDE.md 與 MEMORY.md）：項目進度 / 協作交接 / 登記表單 / 庫存控管 / 日期紀錄
- 影響：使用者一提到舊名 skill 就會載入；新人讀 skill 會以為舊名仍是正稱。
- 修法：把 description 那行 5 個短名改為 Notion 實際 title。

**P0-2（custom skill）n8n-makesense.md 資料流向假設 WP 仍是主入口**
- 位置：line 39-43「WP 是主要資料入口，Notion 是分析後端。庫存數量以 WP `stock_quantity` 為唯一真實來源。」
- 衝突文件：`makesense-web-LEGACY.md` line 5「WP 站於 2026/04 退役」；`makesense-ink/CLAUDE.md`（現行主力是 Next.js + Supabase）
- 影響：n8n workflow 設計時若仍依此 skill，會生成「WC → n8n → Notion」單向，但現況庫存真相已轉到 Supabase（DB06 進銷明細直寫 products.stock）。
- 修法：把第一節資料流向改成「Notion ↔ Supabase 雙向（n8n daily sync + 即時 webhook）；WC 已退役」。

**P0-3（custom skill）n8n-makesense.md WC REST credentials 仍列現役**
- 位置：line 49-53 表格「WooCommerce REST API / Il1kZIud6BscF71H / 生產中」、第三節 line 94-95「WC webhook 注意」、第五節「WF_POS_to_Notion / WF_WC_Order_to_Notion / WF_WC_Product_Events_to_Notion 生產中」
- 實況：WP 已退役 → 這些 workflow 應已停用或改寫為 Supabase webhook
- 影響：使用者問「我的 POS 同步壞了」，skill 會引導到不存在的 WP webhook 設定頁。
- 修法：在第二節加退役註記；第五節 workflow 表加狀態欄區分「已退役 / 現役」；現役應有 `WF_DB04_Sync`、`WF_DB05_Sync` ... 對應 makesense-ink 那 5 個 webhook URL（DB04~DB08）。

### 🟠 P1（不修會混淆，但影響範圍局部）

**P1-1（本地 .md 自相矛盾）DB04 schema 在 4 份文件描述不一致**
- `notion_structure.md` line 28-43：完整新 schema（含「協作名稱 / 活動細項 / 實際單價 / 預計單價 / 數量上限 / 最低數量 / 簡介摘要 / 登記發佈 / 距離km」）
- `makesense-ink/CLAUDE.md` line 211-222：與 notion_structure.md 一致 ✓
- `MEMORY.md` line 71-75（DB04 區塊）：只列出「對應辦理單位 / 單價 / 執行時間 / 距離(km)」— 缺活動細項、實際/預計單價、登記發佈、最低數量、簡介摘要
- `/Users/jay049/CLAUDE.md`：DB04 完全沒有欄位區（只有名稱、page id），未補今天剛改的 schema
- 修法：把 notion_structure.md 的 DB04 區塊摘要塞進 MEMORY.md 與 global CLAUDE.md。

**P1-2（本地 .md 自相矛盾）「距離 km」括號版本不一致**
- `notion_structure.md` line 41：**「距離km」（無括號）**
- `MEMORY.md` line 75：**「距離(km)」（有括號）** — 衝突
- `makesense-ink/CLAUDE.md` line 217：**「距離km（number，無括號）」** — 與 notion_structure.md 一致
- 影響：Notion 真實欄位若為無括號，MEMORY 寫成有括號會導致 sync 程式碼 query property 失敗。
- 修法：以 notion_structure.md 為準（無括號），改 MEMORY.md。

**P1-3（custom skill ↔ 本地）n8n-makesense.md 未反映 5 個 makesense-ink 即時 sync webhook**
- skill line 117-124 只列舊 WP 系列 workflow，未列 makesense-ink/CLAUDE.md line 388-393 的 5 個 webhook URL（sync-db04~db08）
- 修法：在第五節 workflow 清單補現役 5 條 webhook + n8n daily sync (workflow ID C8Tc2zIoSW4THUr2)。

**P1-4（本地 .md ↔ 真相）DB07 商品ID 即條碼說明只在 MEMORY.md，CLAUDE.md 未提**
- MEMORY.md line 82：「商品ID = ISBN/EAN/自編條碼（同步進 Supabase products.sku 與 products.barcode）」
- global CLAUDE.md DB07 段：未提及；只列「商品選項 / 細項 / 庫存類型」
- 今天剛改：DB07 商品ID 即條碼是今日 schema 變動。global CLAUDE.md 應補一行。

**P1-5（本地 .md ↔ 真相）Discord 退役在 global CLAUDE.md 已標註，但 n8n skill 第五節 WP webhook 機制仍用 Discord 時代留下的 stale 假設**
- 今天「系統總論刪 Discord」已改 Notion，但 skill 沒同步檢視。
- 修法：skill 重看一遍是否殘留 Discord 假設（目前掃過沒看到，先列出待人工確認）。

### 🟡 P2（次要、命名統一類）

**P2-1（本地 .md）DB 短名在不同文件用不同寫法**
- global CLAUDE.md line 表格用：「資源提案 / 績效管考 / 項目進度 / 協作交接 / 登記表單 / 進銷明細 / 庫存控管 / 關係經營 / 日期紀錄」 ✓
- MEMORY.md line 17 文字串：同上 ✓
- makesense-ink/CLAUDE.md line 192-201 表格：DB03 寫「**工作項目進度**」（舊名；其他都用新名） — 不一致
- 修法：改 makesense-ink/CLAUDE.md line 195 為「項目進度」。

**P2-2（本地 .md）global CLAUDE.md 舊名對照註解
- global CLAUDE.md「舊名對照」段已清楚說明，但只列 DB03/04/05/07/09，缺 DB07「庫存資產→庫存控管」（已列）、DB04「共識交接協作→協作交接」（已列）。實際完整。✓

**P2-3（custom skill）makesense-web-LEGACY.md 雖標 LEGACY 但內容良好**
- 所有資訊已凍結為歷史紀錄，標註清楚。✓ 不用動。

**P2-4（本地 .md ↔ 今日改動）DB04「登記發佈」status 欄位（DB04 專屬，其他 DB 仍叫「發佈狀態」）— 此規則只在 notion_structure.md + makesense-ink/CLAUDE.md 出現**
- MEMORY.md、global CLAUDE.md 完全沒提這個「DB04 專屬命名」例外，未來改 sync 程式碼會踩坑。
- 修法：MEMORY.md DB04 區塊補一行「登記發佈 status（DB04 專屬，其他 DB 叫發佈狀態）」。

**P2-5（custom skill ↔ 本地）n8n skill 第七節 aiI_meta 四段格式 vs 三道關鍵欄位**
- skill：aiI_meta 是「快速摘要 / 關聯說明 / AI 使用建議 / 歷程備注」
- notion_structure.md line 113-117：「三道關鍵欄位 = 簡介摘要 + 對應標籤 + ai_meta」，且 ai_meta 格式是 `[類型]｜[時間]｜[DB]`（結構化標記）— 跟 skill 的四段格式不一樣
- 衝突等級：可能是「兩種 ai_meta」（DB05 辨識用四段、其他 DB 用三欄結構化標記），但本地文件未交代。
- 修法：在 notion_structure.md 三道關鍵欄位段加註「DB05 辨識 workflow 另用四段 aiI_meta，見 n8n skill 第七節」。

### 🟢 P3（提醒類）

**P3-1（B 維度未完成）** Notion 8 份指南頁未拉 raw 比對。建議下次 audit 用 Notion MCP `notion-search` + `fetch` 各頁，逐節對齊本檔列出的 schema 變動。

**P3-2** `~/.claude/agents/` 目錄不存在；如未來要加 custom agent，建議建立並在 global CLAUDE.md 加說明。

---

## 統計

| 級別 | 條數 |
|------|------|
| P0 | 3 |
| P1 | 5 |
| P2 | 5 |
| P3 | 2 |
| **總計** | **15** |

| 來源維度 | 條數 |
|---------|------|
| Custom skill 端（C 維度，新加比對）| **5**（P0-1, P0-2, P0-3, P1-3, P2-5）|
| 本地 .md 互比（A 維度）| 7 |
| 本地 vs Notion schema 真相（B 維度部分）| 2 |
| 待補 / 提醒 | 1 |

---

## 建議動作優先序

1. 立刻修 `n8n-makesense.md` description 的舊 DB 短名（P0-1）+ WP 退役註記（P0-2, P0-3, P1-3）— 一次大改 skill。
2. 補 MEMORY.md：DB04 完整 schema、距離 km 無括號、DB04「登記發佈」例外（P1-1, P1-2, P2-4）。
3. 補 global CLAUDE.md DB07 商品ID = 條碼（P1-4）。
4. 改 makesense-ink/CLAUDE.md DB03「工作項目進度→項目進度」（P2-1）。
5. 下次另開 session 跑 Notion 指南頁（B 維度）對齊（P3-1）。
