---
name: check3-5
description: |
  makesense（現思文化）DB schema 變動後的「3 路稽核 + 5 重驗證」全套流程。
  當使用者提到以下任何情境時，立即載入此 skill：
  - 「幫我檢查官網↔Supabase↔Notion」
  - 「跑一次稽核 / check / 對齊 / 比對」
  - 「我改了 DBxx 的欄位 / 選項 / 名稱」
  - 「我刪掉/新增 select 欄位」
  - 「DB schema 改了/變了」
  - 「git 健檢 / repo 檢查 / 看本機 git 狀態」
  - **「檢查3+5 / 檢查3&5 / 檢查35 / 檢查3-5」**（自然語）
  - **「check3+5 / check3&5 / check 3 加 5 / 跑 3+5」**
  - 直接打 `/check3-5` 或 `/check35`
  - 向下相容：「check3+4 / check3&4 / check34 / 檢查3+2 / check3-2 / check32」（舊名仍可觸發）

  目標：使用者每次改 DB schema（改名 / 刪欄位 / 改選項 / 加 relation）後，
  自動跑完整稽核找出所有需要對齊的位置，產整合報告，再詢問是否動手修。

  使用者風格：每次只大致說明改了什麼（甚至不講），AI 自己抓 live schema 比對找差異。
---

# /check3-5 — 全套稽核流程

## 零、術語與名詞速查

**3 = 三路稽核（3 個並行 audit agent）**
1. **官網程式碼**（makesense-ink Next.js）
2. **本地 markdown 文件**
3. **Notion 指南頁面**

**5 = 五重驗證（5 個交叉校驗）**
1. **Live Schema vs Memory Snapshot** — 從 Notion 抓最新 9 DB schema，跟 `memory/notion_structure.md` 比對找出真實 diff
2. **Code ↔ Supabase Mapping** — sync route 寫入欄位 vs Supabase 表結構是否對齊
3. **n8n Workflow ↔ Schema** — 每個 active n8n workflow 的 node 配置是否還在用舊欄位/option（用 n8n MCP 工具掃描）
4. **Claude Skill ↔ Schema** — `~/.claude/skills/*.md`、`~/.claude/commands/*.md`、Notion SKILL 頁面是否還引用舊欄位/option
5. **git repo 健檢** — 未 commit 改動、未推 commit、secret 滲漏、大檔、.env 入庫、rebase/merge 卡住（Step 1.8）

---

## 一、執行前必讀（每次啟動）

### 9 個 DB（以 Notion 實際 title 為單一真相）

| DB | Page ID | Collection ID |
|---|---|---|
| DB01 資源提案 | e2d16f2a01814d9f8adce25ed61e633c | 722f2478-7e61-4b4b-ad1c-d171b4a639db |
| DB02 績效管考 | df3aea7e12d24d268ee1d3cdcdf8e0a5 | c286e19b-9cf8-422b-8628-98b6d116040c |
| DB03 項目進度 | 8380024499b347f0aad4ecdf0e4d8d1d | 968b23ea-da1f-4381-bd9a-253ee80b0656 |
| DB04 協作交接 | 99808f9cd0ab4c21bc684d8836150207 | 5ad63416-a7c5-4d84-812e-cddf56c8bc01 |
| DB05 登記內容 | e5f14f056c7c4b8a804304eab598fd4d | 28a667a9-ede1-466a-9f18-419da33a8810 |
| DB06 清單明細 | 3469ff25fdab83c98ff98107ee6a6a1c | a809ff25-fdab-8236-b491-87496d236ac9 |
| DB07 庫存控管 | 1a7e3684754d47bcb335cf5b795454ac | 0f5a87d4-d1df-4271-ba00-2abfee01693d |
| DB08 關係對象 | 873970187f394f6b8304406745bd1579 | 6934a808-b79b-4446-98dd-f699476408a0 |
| DB09 日期紀錄 | b10ed6ed4afc48d58539790da89b2e08 | 6547375e-ff14-4f24-ab0f-9f2a223a8580 |

### 禁用字串清單（出現 = bug）

> 規則：以下字串在程式/文件/Notion 出現 = 過時殘留。括號內為現行對應。例外：DB06 段落內「圖文影音」/「登記選項」**保留**（DB06 仍用此名）；audit_*.md / legacy/ 跳過。

**DB 名**：登記表單(→登記內容) / 進銷明細(→清單明細) / 關係經營(→關係對象)

**DB04 欄位**：協作選項(→協作類別) / 活動細項(→活動選項) / 登記發佈(→發佈狀態) / 實際單價、預計單價(→已刪 / formula 實際總價) / 交接備註(→交接回覆) / 交接名稱(→協作名稱) / 門市選項(→門市類別)

**全 DB 欄位**：對應表單(DB01~09 全部改名→對應內容；任何 DB context 出現均為 bug，無豁免)

**DB04 option**：走讀行旅(→導覽走讀) / 場地使用(→使用場地) / 活動辦理(→辦理活動) / 內容製作(→製作內容) / 工坊手作、數位活動、典禮儀式、藝文表演、其他(→已刪；現行活動選項只有 6 個：陳列展售/文化冊展/講座課程/園遊市集/導覽走讀/會議展演)

**DB05 欄位**：表單名稱(→內容名稱) / 表單類型(→內容類型) / 內容類別(→素材類別) / 登記選項(DB05→登記類別+報名選項；DB06 保留) / 互動選項(→互動類別) / 文書類型(→文書備項) / 點交選項(→點交備項) / 內容選項(→素材類別) / 庫存細項(DB05→庫存選項；DB06 無此欄) / 對應參考提案(→提案引用) / 對應參考資料對象(→對象引用)

**DB05 option**：圖文影音(DB05→內容素材；DB06 保留) / 預約報名(→填寫報名+報名選項=活動/空間/意見) / 請款請購(→紀錄費用) / 官網內容(已刪除；官網文章改用 文案選項=網頁社群 + 社群細項=Sense官網 篩選)

**DB05 已刪欄位**：紀錄備項 / 通知細項 / 規劃細項 / 撥補備項 / 雜支備項 / 雜支備註 / 地點備項 / 場域備項 / 行政類型 / 設備流程 / 商品認列 / 產品類型 / 登記加購 / 登記會員類別 / 報價類型 / 連結類型 / 參考類型 / 提問答復(typo→提問答覆) / 日期確認 / 點擊數 / 點擊次數 / 簽到狀態 / 收費狀況 / 費用收退 / 發放設備 / 掃描上傳 / 按讚 / 分享數 / 留言數 / 單日人數 / 單日客組 / 付款方式 / 活動類型

**DB05 三層 relation**（規則）：
- **對應X** 9 個：對應 提案/管考/項目/協作/對象/地點/庫存/明細/日期（程式聚合+Supabase 同步只走這層）
- **X引用** 9 個：提案/管考/項目/協作/內容/明細/庫存/對象/日期 引用（人工/AI 寫；純 Notion 內部，不同步 Supabase）
- **X被引** 9 個：提案/管考/項目/協作/內容/明細/庫存/對象/日期 被引（**由 Notion dual-sync 自動鏡射 X引用 反向，AI 不需操作**；不同步 Supabase）

**DB06 欄位**：提問答復(→提問答覆) / 連結類型(→連結備項) / 點交選項(→點交備項) / 細流選項(→細流細項) / 行政類型(→行政細項) / 聯繫類型(→**通知細項**) / 規劃選項(→規劃細項) / 維護選項(→維護細項)

**DB06 option**：聯繫互動(→互動聯繫；明細類型正確值)

**DB06 已刪欄位**：登記類型 / 庫存選項 / 表單類型 / 協作選項 / 互動選項 / 收費狀況 / 產品類型 / 點擊次數 / 付款方式 / 商品認列 / 登記發佈 / 地點備項 / 場域備項

**DB08 欄位**：經營名稱(→對象名稱) / 對應標籤表單(→對應標籤內容) / 對應地點表單(→對應地點內容) / 對應表單對象(→對應對象內容)

**DB09 欄位**：對應建立表單(→對應建立內容) / 對應執行表單(→對應執行內容) / 對應截止表單(→對應截止內容) / 對應起算表單(→對應起算內容)

**X被引描述反義詞**（出現 = 過時敘述，需改為「dual-sync 自動鏡射」）：廣撒 / 巡邏 / 廣泛寫入 / 獨立第三鏈 / 反向掛回 / 不走 auto dual sync / 不走 Notion auto dual sync / AI 廣撒寫入

**DB05 欄位（2026/05/14）**：ai辨識分析(→分析備註) / ai_meta(→分析備註；DB05 原有 ai_meta 欄位已刪除；DB01-04、DB06-09 的 ai_meta 已全數改名 ai備註→2026/05/17 再改名 分析備註)
**全 DB 欄位（2026/05/17）**：ai備註(→分析備註；DB01-09 全數改名)；同時新增 核銷備註（DB01-09 共用，text）

**法人名**：現思文化創藝**術**有限公司(多「術」字錯字 → 現思文化創藝有限公司)

**已退役服務**：
- Cloudinary（2026/04/29 停用，圖檔已全面遷移至 Cloudflare R2；程式/文件/Notion 任何 active 上下文出現 = bug；audit_*.md / legacy/ 豁免）
- Discord Bot（2026/04/23 退役，改用 Telegram Bot；`discord`/`DISCORD_`/Discord Owner ID 出現在 active 段落 = bug；退役紀錄段落豁免）
- WordPress / WooCommerce（2026/04 退役，`makesense.site`/`wc/v3`/`wp-json`/`WooCommerce` 出現在「現行系統」描述 = bug；歷史對比表豁免）
- deepface（已換 insightface + ONNX；`deepface` 在現行技術棧描述出現 = bug）
- cloudinary npm package（`"cloudinary":` 在 package.json = zombie dependency）

**路徑**：`~/Documents/工作參考資料/makesense-ink/`(舊路徑備份不寫入 → `~/Code/makesense-ink/`)

### 6 層命名公約（select 後綴）

| 層 | 後綴 | type | 角色 |
|---|---|---|---|
| 1 | 類型 | select | 頂層大分類 |
| 2 | 類別 | select | 從上層某選項展開的子分支 |
| 3 | 選項 | select | 子分支內的具體分流 |
| 4 | 細項 | select | 更窄的具體子分流 |
| 5 | 備項 | select | 最末端的目錄項 |
| 6 | 雜項 | multi_select | 跨類別標籤池 |

**自動命名規則**：上層 select 某選項末 2 字 = 下層欄位開頭。
- 範例：內容類型→「內容素材」→ 素材類別 →「文案」→ 文案選項 →「行政文書」→ 文書備項

### 4 角色標籤（不是每個欄位都符合 6 層公約，分 4 角色）

| 角色 | 描述 | 範例 |
|---|---|---|
| **A 階層**（6 層公約嚴格適用）| 主分類鏈 | 內容類型→登記類別→報名選項 |
| **B 元資料 enum**（單維列舉）| 屬性/狀態/形式/進度/年份/區域/方式 結尾 | 進貨屬性、行政區域、付款方式 |
| **C SOP checkbox**（值班勾選偽 select）| 用「未完成/完成🙌」當值 | 開小燈、垃圾回收、餐具歸位 |
| **D 標籤池**（multi_select 分類池）| `XX備項/細項/選項`(multi) | 圖像備項、物件備項、項目參考 |

### 跨 DB 剛性原則（DB04/05/06 之間）

1. **欄位名稱跨 DB 不可重複** — 三胞胎欄位必須改名其中之一
2. **option 字串跨 DB 不可重複** — 同一 option 字串只能在一個 (DB.欄位) 出現

### 對應 / 引用 / 被引 三層 relation（DB05 已實作，2026/05/08 升級）

- **對應X**（9 個 + ai_對應X）= 直接上下游（程式聚合 / partner_metrics_v 等都看這個，可手動寫）
- **X引用**（9 個）= 引用提及，出向（純語意參考，不參與聚合，可手動寫）
- **X被引**（9 個）= 此 page 被他人引用，入向（**由 Notion dual-sync 自動鏡射**——X引用 反向；AI 不需操作；人工只在 X引用 端裁切；不參與聚合，不同步 Supabase）
  - 提案被引 / 管考被引 / 項目被引 / 協作被引 / 內容被引 / 明細被引 / 庫存被引 / 對象被引 / 日期被引

---

## 二、SOP（被觸發後逐步執行）

### Step 0 — Schema diff（30 秒）

**目的**：確認 user 改了什麼。

1. 用 `mcp__73449d04-...__fetch` 抓 9 DB collection schema（特別是 DB04/05/06）
2. 跟上次抓的 schema snapshot（存在 `/private/tmp/claude-501/.../tool-results/` 或 memory）比對
3. 如果有 diff（欄位刪除 / 改名 / 新增）→ 列給 user 確認方向
4. 如果沒 diff 但 user 說「改了」→ 詢問 user 改了哪些（避免誤判）

**SchemaDiff 輸出範例**：
```
DB05 變動：
  改名：表單名稱→內容名稱、表單類型→內容類型
  新增：3 個 select、4 個 relation
  刪除：紀錄備項、通知細項...
```

### Step 1 — 三路稽核並行 spawn

**並行 spawn 3 個 agent**（一個訊息內 3 個 Agent tool call）：

#### Agent 1：程式碼層
範圍：`/Users/jay049/Code/makesense-ink/`（git head main）
重點：app/api/**、lib/**、scripts/**、components/workbench/**、components/partner/**

找這幾類問題：
- 🔴 寫死的舊欄位名字串（會 runtime error）
- 🔴 舊 option 值（select { equals: "..." }）
- 🟡 sync route 欄位 mapping 與 Supabase schema 不匹配
- 🟡 程式語意把「對應X」當「引用X」用（partner_metrics_v 等聚合查詢應該只看 對應X）
- 🟢 註解 / 變數命名過時

特別注意 DB05 vs DB06 同名欄位差異：
- DB05 改名 / DB06 保留：登記選項（DB06 仍叫登記選項，DB05 改登記類別+報名選項）
- DB05 改名 / DB06 也改：點交選項→點交備項（兩邊都改）
- DB06 已刪：庫存選項、互動選項、表單類型、協作選項、登記類型（5/7 刪）

#### Agent 2：本地 markdown 文件
範圍：
- `/Users/jay049/Code/makesense-ink/*.md`（CLAUDE.md, INTAKE.md, *_HANDOFF.md, PRE_LAUNCH_STATUS.md）
- `/Users/jay049/.claude/projects/-Users-jay049-Documents-------/memory/*.md`（**audit_*.md 是歷史快照可跳過**）
- `/Users/jay049/CLAUDE.md`
- `/Users/jay049/.claude/skills/*.md`（含本 skill 自己）

找：所有舊欄位名 / 舊 option 值 / 舊 DB 名出現處。
跳過：legacy/ 子目錄、`audit_*.md`（歷史）。

#### Agent 3：Notion 指南頁面
範圍（fetch 深度 2 層子分頁）：
- 系統總論指南 `2869ff25fdab80c6a266f1228f8bd587`
- 資料庫類別指南 `3279ff25fdab80a18fffff56c578a86a`
- 組織架構指南 `3289ff25fdab80fa90b8f5d408a366fa`
- 文案撰寫指南 `3279ff25fdab80aaa42be8d6dd91daed`
- 圖像製作指南 `3299ff25fdab8040bcaad28122bebff8`
- 各類指南總頁 `2799ff25fdab80fea78ee261b4e792a2`
- 官網維護指南 `32c9ff25fdab81389368eac6f77bc417`
- 官網內容撰寫指南 `3329ff25fdab8017b9a3eae1fb7fb5a2`
- DB欄位字典 `32b9ff25fdab81caadd5e016cced1efe`
- DB維護指南 `ae64587214664fdcaff008c3574112f3`

找：舊 DB 名 / 舊欄位名 / 舊 option 值。
**特別小心**：DB06 段落內的「圖文影音 / 登記選項」**保留不改**。
**DB06 已於 2026/05/07 刪除**：庫存選項、點交選項（→點交備項）、互動選項、表單類型、協作選項、登記類型 — 指南若還寫這些 = bug。

### Step 1.5 — 缺載新設計評估（**重要，不要跳過**）

不只找「舊名殘留」，還要主動評估：**user 最近新增的欄位 / 新設計 是否該補進指南**。

範例情境：
- DB05 新增 9 個引用 relation → 應補進「資料庫類別指南」「DB欄位字典」「官網維護指南」等
- 新建 6 層命名公約 → 應寫成獨立指南頁
- 新增 select 欄位（素材類別 / 報名選項 / ...）→ 指南若描述 DB05 schema 但沒提到 = 缺載

對每個近期新增 / 改名的 schema 元素，主動問：
1. 這個概念在哪些指南頁出現是合理的？
2. 那些頁面**目前有沒有提到**？
3. 如果沒提到 = 缺載 = 要補

回報時開「缺載建議清單」第二大段，列出建議補進哪些頁面 + 建議內容大致是什麼。

**不要**因為「沒人用舊名所以沒過時」就跳過 — 缺載也是過時的一種形式。

### Step 1.6 — n8n workflow 稽核（**Verify 3**，2026/05/07 新增）

**為什麼要做**：n8n workflow 的 Notion node 直接寫死欄位名/option 字串。schema 改名後若 workflow 沒跟著改，下次觸發會 throw `validation_error`，且 user 在 Notion 端按「發佈更新」按鈕完全沒反應，很難 debug。

**用的 MCP 工具**：`mcp__a7fc8d57-...__*` 系列
- `search_workflows` — 列出所有 workflow
- `get_workflow_details` — 拿單個 workflow JSON 含 node 配置
- `update_workflow` — 修改 workflow（如要 fix）

**已知 active workflows（每次稽核都要掃）**：
| Workflow | ID | 觸發 | 對應 DB |
|---|---|---|---|
| n8n daily sync | `C8Tc2zIoSW4THUr2` | cron 每天 8AM | 全 DB → Supabase |
| WF_DB04_Sync | （查 search） | DB04「發佈更新」 | DB04 → events |
| WF_DB05_Sync | （查 search） | DB05「發佈更新」 | DB05 → articles |
| WF_DB06_Sync | （查 search） | DB06「發佈更新」 | DB06 → products.stock |
| WF_DB07_Sync | （查 search） | DB07「發佈更新」 | DB07 → products |
| WF_DB08_Sync | （查 search） | DB08「發佈更新」 | DB08 → persons/topics/partners/staff |
| 其他規劃中 workflows | — | — | 見 n8n-makesense skill 第五節 |

**稽核流程**（spawn 一個 agent）：

1. `search_workflows` 列所有 active workflows
2. 對每個 workflow，`get_workflow_details` 拿 JSON
3. **掃描 node 配置 JSON 字串**，找：
   - 寫死的舊 Notion 欄位名（表單名稱/表單類型/內容類別/登記發佈/協作選項/活動細項/...）
   - 寫死的舊 option 值（圖文影音/預約報名/走讀行旅/場地使用/...）
   - HTTP Request body 內的 properties payload 是否還在用舊欄位
   - filter 條件 `{ property: "X", select: { equals: "..." } }` 的 X 與 ... 是否還是舊名
4. **特別注意**：
   - DB05 大改名：表單名稱/表單類型/內容類別/登記選項/互動選項/文書類型/點交選項/庫存選項/對應參考提案/對應參考資料對象 → 全改名
   - DB05 option：圖文影音→內容素材（DB05 only）；預約報名→填寫報名+報名選項
   - DB04 改名：協作選項→協作類別、活動細項→活動選項、登記發佈→發佈狀態、交接名稱→協作名稱、門市選項→門市類別、場地使用→使用場地、走讀行旅→導覽走讀、實際單價/預計單價→formula 實際總價
   - DB05 新增 9 個 X引用 + 9 個 X被引 relation：sync workflow **不要**把 X引用 / X被引 抓到 Supabase（純 Notion 內部）；X被引由 Notion dual-sync 自動鏡射（X引用 反向），AI 寫 X引用 即可、不需手動寫 X被引
5. 對每個 workflow 回報舊名/錯欄位的 node 位置（node name + 欄位）
6. **修復**（若 user 授權）：用 `update_workflow` 把舊名替換成新名
7. 完成後可選擇用 `test_workflow` 驗證一筆是否正常通過

**Spawn agent prompt 模板**：

```
你是 n8n workflow 稽核員。用 mcp__a7fc8d57-...__search_workflows 列所有 active workflows，
逐個 mcp__a7fc8d57-...__get_workflow_details 取 node 配置 JSON。

當前 schema 真相（這些是「新」名字，舊名 = bug）：
[此處貼上 Step 0 抓到的最新 schema 對照表]

對每個 workflow 找：
🔴 寫死的舊欄位名字串
🔴 寫死的舊 option 值
🟡 filter 條件用了舊名（會找不到資料但不 throw）
🟢 註解 / 變數命名過時

特別小心：DB05 vs DB06 同名欄位差異很多（DB06 schema 沒大改）

回報：每 workflow node-by-node 列出問題。≤500 字。不要改 workflow（除非另外授權 fix）。
```



### Step 1.7 — Claude Skill 稽核（**Verify 4**，2026/05/10 新增）

**為什麼要做**：`~/.claude/skills/*.md`、`~/.claude/commands/*.md`、Notion 上的 SKILL 頁面（hihi 系列、makesense-guide-router、本 skill 自己等）會寫死欄位/option 字串作為 schema 真相對照表。schema 改名後若 skill 沒同步更新，下次 skill 被觸發時會把過時的 schema 當作真相，造成 AI 行為錯誤（找不到欄位、用舊 option 篩選、誤導其他 agent）。

**稽核範圍**：
1. **本機 skill 檔**：`~/.claude/skills/*.md`（含 anthropic-skills/ 子目錄裡的 makesense 專屬 skill，如 n8n-makesense）
2. **本機 command 檔**：`~/.claude/commands/*.md`
3. **Notion SKILL 頁面**：hihi 系列（hihianly/hihicheck/hihiconnect/hihioutline/hihisearch）、makesense-guide-router、本 skill (`check3-5`) 自己

**稽核流程**（spawn 一個 agent）：

1. `ls ~/.claude/skills/ ~/.claude/commands/` 列出所有檔案
2. 逐個 Read，掃描內容找：
   - 寫死的舊 Notion 欄位名（表單名稱/表單類型/內容類別/登記發佈/協作選項/活動細項/門市選項/交接名稱/實際單價/預計單價/交接備註/...）
   - 寫死的舊 option 值（圖文影音 in DB05/預約報名/走讀行旅/場地使用/請款請購/紀錄備項/...）
   - 寫死的舊 DB 名（登記表單/共識交接協作/進銷明細/庫存資產/關係經營/範圍日期）
   - 寫死的已刪除欄位（紀錄備項/通知細項/規劃細項/收費狀況/付款方式/活動類型 等 30+）
3. **特別小心**：
   - skill 自身（本 `check3-5.md`）的「禁用字串清單」段落本來就要列舊名作為禁用規則，那是正確設計，不算 bug
   - 非「禁用清單段」的地方寫死舊名 = bug
4. 對 Notion SKILL 頁面：用 `mcp__73449d04-...__fetch` 抓內容掃描
5. 回報每個 skill / command 的舊名出現位置（檔名 + 行號 / Notion page id + 段落）

**Spawn agent prompt 模板**：

```
你是 Claude skill 稽核員。掃以下三個範圍：
1. ls ~/.claude/skills/ + Read 每個 .md
2. ls ~/.claude/commands/ + Read 每個 .md
3. fetch Notion SKILL 頁面（page id 列表如下）

當前 schema 真相（這是「新」名字，舊名出現 = bug）：
[此處貼上 Step 0 抓到的最新 schema 對照表]

對每個檔案找：
🔴 寫死的舊欄位名 / 已刪除欄位
🔴 寫死的舊 option 值（DB05 圖文影音、預約報名、走讀行旅、請款請購等）
🔴 寫死的舊 DB 名（登記表單、共識交接協作、進銷明細、庫存資產、關係經營、範圍日期）
🟡 描述跟現況不一致

⚠️ 例外：本 check3-5 skill 的「禁用字串清單」段落本來就要列舊名作為禁用規則，那是正確設計

回報：file:line 或 page_id:段落 + 舊字 → 新字。≤500 字。
不要改任何檔案。
```

---

### Step 1.8 — git repo 健檢（**Verify 5**，2026/05/10 新增）

**為什麼要做**：本機有多個 git repo（makesense-ink、brand_monitor、其他），schema 改完後本來就會 commit + push。但 repo 本身的衛生（未 commit 的零散改、堆積的本地 commits、偷渡的 secret、不該入庫的大檔）跟 schema 對齊一樣重要——schema 變更會帶出大量 code 改動，順便健檢可以撿出長期累積的 git 髒亂。

**稽核範圍**：
1. **makesense-ink**（必查）：`/Users/jay049/Code/makesense-ink/`
2. **brand_monitor**（必查）：`/Users/jay049/Documents/工作參考資料/brand_monitor/`
3. **其他**：在 `/Users/jay049/Documents/工作參考資料/` 與 `/Users/jay049/Documents/` 找 `.git/` 自動納入

**7 項檢查**：

| 檢查 | 嚴重度 | 判定方式 |
|---|---|---|
| 1. 未 commit 的改動 | 🟡 | `git status --short` 有輸出 |
| 2. 本地 commit 沒推 | 🟡 | `git rev-list @{u}..HEAD --count` > 0 |
| 3. 太久沒動的分支 | 🟢 | `git for-each-ref` mtime > 90 天 |
| 4. 偷渡的 secret | 🔴 | grep 規則：sk-ant-、AKIA、`-----BEGIN.*PRIVATE KEY-----`、`Bearer `、ghp_、xoxb- 等 |
| 5. 100MB+ 大檔 | 🟡 | `git ls-files | xargs ls -l | awk '$5>100MB'` |
| 6. .env / .DS_Store 入庫 | 🔴 | `git ls-files` 命中 .env、.DS_Store、credentials.json |
| 7. rebase/merge 卡住 | 🔴 | `.git/MERGE_HEAD`、`.git/rebase-merge/` 存在 |

**Spawn agent prompt 模板**：

```
你是 git repo 健檢員。對下列 repo 各跑 7 項檢查：

repos:
- /Users/jay049/Code/makesense-ink/
- /Users/jay049/Documents/工作參考資料/brand_monitor/
- 任何其他在 /Users/jay049/Documents/ 內找到的 .git/

對每個 repo 跑：
1. cd <repo> && git status --short
2. git rev-list @{u}..HEAD --count（若有 upstream）
3. for-each-ref --sort=-committerdate refs/heads（看最舊分支）
4. grep -rE 'sk-ant-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z]+ PRIVATE KEY-----|ghp_[a-zA-Z0-9]{20,}|xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+' --include='*.{js,ts,py,sh,env,json,yml,yaml}'
5. git ls-files | xargs -I{} ls -l {} 2>/dev/null | awk '$5 > 104857600 {print $5, $NF}'
6. git ls-files | grep -E '^\.env$|\.DS_Store$|credentials\.json$|.*\.pem$'
7. ls .git/MERGE_HEAD .git/rebase-merge .git/rebase-apply 2>/dev/null

回報每個 repo 的問題，按嚴重度（🔴 > 🟡 > 🟢）。
🔴 級必須立刻處理（secret / 卡狀態 / .env 入庫）。
不要動任何檔案、只報告。≤300 字 per repo。
```

**特別注意**：
- 找到 secret → **絕對不要在報告中印出該 secret 的完整字串**，只標「位置 + 規則類型 + 前 6 字 ...」
- .env 已 commit → 提醒 `git rm --cached .env` + `.gitignore` 加上、之後 force push 清歷史

---

#### Verify 1：Code ↔ Supabase mapping
跑這段 grep：
```bash
grep -rn "supabase.*from\|.upsert\|.insert\|.update" --include="*.ts" --include="*.mjs" \
  /Users/jay049/Code/makesense-ink/{app/api,lib,scripts}
```
比對：sync 寫入 Supabase 的欄位是否還匹配 Supabase 表結構（用 `mcp__4b0f2cc0-...__list_tables` 查 Supabase）。

#### Verify 2：寫死的 option 字串還活著
找所有 `select { equals: "X" }` 或 `select: { name: "X" }` 模式：
```bash
grep -rE 'select.*name.*"[^"]+"' --include="*.ts" --include="*.mjs" \
  /Users/jay049/Code/makesense-ink/
```
逐個檢查那個 option 字串是否還在 Notion schema 裡。被刪的 option = bug。

### Step 3 — 整合報告

把 5 份結果合併，按嚴重度排序：

```
🔴 真的會壞（runtime error）：N 條
  - file:line — 問題 + 建議

🟡 邏輯不對但不 throw：N 條
  - file:line — 問題

🟢 註解 / 文檔過時：N 條
  - 檔名:行號 列表

整體狀態：
- 程式碼: X 處
- 本地 md: X 檔 / X 處
- Notion 指南: X 頁 / X 處
- 預估修復時間：X 分
```

### Step 4 — 詢問動手

「要我修嗎？」三個選項：
- **A**：全部一次修（spawn fixer agent）
- **B**：只修最嚴重那層（程式碼或某幾頁 Notion）
- **C**：只給清單，使用者自己分批改

### Step 5 — 修完後寫 memory snapshot

完成後在 `memory/notion_structure.md` 記錄：「最後一次稽核 = YYYY-MM-DD，schema 狀態：…」
這個 snapshot 是下次 Step 0 比對的基準。

---

## 三、稽核細則（給 spawn 出去的 agent 用）

### 程式碼 agent prompt 模板

```
你是 makesense.ink 程式碼稽核員。工作目錄：/Users/jay049/Code/makesense-ink/

## 當前 schema 真相（這是「新」名字，舊名出現就是 bug）
[此處貼上 Step 0 抓到的最新 schema 狀態，含 DB 名、欄位、options]

## 找這幾類問題
🔴 真的會壞 — 寫死舊欄位名字串、舊 option 值
🟡 邏輯怪 — sync mapping 對不上、語意「對應 vs 引用」誤用
🟢 註解過時

## 範圍
app/api/**、lib/**、scripts/**、components/workbench/**、components/partner/**

## 注意
- DB05 vs DB06 同名欄位差異很多（登記選項 DB05 改名/DB06 保留；庫存選項/點交選項等 DB06 已於 2026/05/07 刪除或改名）
- 「對應參考X」已改成「X引用」（DB05）
- 「對應X」(直接上下游) vs 「X引用」(引用提及，出向) vs 「X被引」(被他人引用，入向；由 Notion dual-sync 自動鏡射，AI 不需寫入) 是三條不同 relation 鏈

## 回報格式
按嚴重度分組，file:line + 問題簡述。≤500 字。
不要改任何檔案。
```

### Md agent prompt 模板

```
範圍：
- /Users/jay049/Code/makesense-ink/*.md
- /Users/jay049/.claude/projects/-Users-jay049-Documents-------/memory/*.md（audit_*.md 跳過）
- /Users/jay049/CLAUDE.md
- /Users/jay049/.claude/skills/*.md

找：所有舊欄位名 / 舊 DB 名 / 舊 option 值。
跳過：legacy/ 與 audit_*.md（歷史快照）。

[貼最新 schema diff 給它對照]

回報：每檔 file:line + 舊字 → 新字。≤400 字。
```

### Notion 指南 agent prompt 模板

```
用 mcp__73449d04-...__fetch 遍歷以下指南頁（深度 2 層子分頁）：
[8 主指南 + DB欄位字典 + DB維護指南 page id 清單]

找：舊 DB 名 / 舊欄位名 / 舊 option 值。

⚠️ DB06 段落內「圖文影音 / 登記選項」保留不改。
⚠️ DB06 已於 2026/05/07 刪除：庫存選項/互動選項/表單類型/協作選項/登記類型；改名：點交選項→點交備項、規劃選項→規劃細項 等。
⚠️ DB05 段落才套 DB05 改名規則。

[貼最新 schema diff 給它對照]

回報：每頁 page_id + 改 N 處清單。≤500 字。
不要改任何頁面。
```

---

## 四、修復策略（Step 4 動手時）

### 修復 agent 應該怎麼修

#### 程式碼批次：
```bash
cd /Users/jay049/Code/makesense-ink
find . -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" | grep -v node_modules | grep -v ".next" \
  | xargs sed -i '' 's/"舊欄位名"/"新欄位名"/g'
```
（也包括註解中的不帶引號版本，第二輪 sed 不帶引號）

#### 本地 md 批次：
針對每檔，逐 sed。
注意：n8n-makesense skill 與 check3-5 skill 自身要 sync。

#### Notion 指南：spawn fixer agent
給它整合清單，逐頁用 `notion-update-page` 改。

#### Commit + push（makesense-ink 才有 git）：
```
refactor: <DBxx schema 改名/刪欄位> 對齊

[列出主要改動]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 修完驗證

1. 跑 grep 一輪確認 0 殘留
2. user 在 Notion 隨便挑一筆 DB 按「發佈更新」按鈕觸發 single sync，看 Vercel logs 有無 throw
3. 跑 `git status` 確認沒漏 commit

---

## 五、新增資料設計變更時補的章節

當 user 引入新的 schema 設計（例如 9 個引用 relation、6 層公約）時：

1. 把設計寫進 `memory/notion_structure.md` 對應 DB 段落
2. 更新本 skill 的「術語速查」章節
3. 更新 `~/CLAUDE.md` 對應 DB 描述
4. （如影響程式邏輯）更新 makesense-ink/CLAUDE.md

---

## 六、不該做的事

- **不要無腦 rename**：改 DB06 段落的「圖文影音」會破壞 DB06（user 沒改 DB06）
- **不要刪 audit_*.md**：那是歷史快照
- **不要修 DB schema 本身**：本 skill 只比對與對齊文檔/程式碼，不動 Notion schema 結構
- **不要碰 legacy/ 目錄**
- **DB04 清潔 SOP 欄位（開小燈/煮兩壺水/等）保留**：那是 user 的 SOP checkbox，雖違反 6 層公約但有業務意義
- **不要動 Supabase schema**（若程式碼與 Supabase 表不對齊，回報給 user，不自動 alter table）

---

## 七、典型對話流程（給 AI 自己參考）

```
User: 我改了 DB05 幾個欄位
AI:   好，跑 /check3-5
      [Step 0] fetch DB05 schema → diff → 我看到改了 X/Y/Z
      [Step 1] spawn 3 agent 並行
      ...等回報...
      [Step 3] 整合報告：14 處要改
      [Step 4] 要我動手嗎？
User: 動
AI:   [Step 5] sed + spawn Notion fixer + commit
      完成。下次再改記得跑 /check3-5
```

---

## 九、AI 反偷懶警示

### 觸發 /check3-5 後**絕對不要**做的事

1. **不要**只看 schema diff 就回「全乾淨」— 必須跑完整 3 路 + Step 1.5 缺載評估才算
2. **不要**跳過子分頁深度遞迴 — 指南頁很多有 3-4 層子分頁
3. **不要**因為「沒人用舊名」就以為對齊 — 新欄位缺載比舊名殘留更隱蔽
4. **不要**因為剛跑過稽核就重複跳過 — user 改了東西才會觸發，當作從頭跑

### 使用者期望

當 user 講「**檢查3+2**」，他要看到的是：
- 真的把每個指南頁子分頁都翻過
- 主動指出該補但還沒補的設計（雙層 relation / 新 select / 新規則）
- 給出修補清單而不是「全乾淨」式偷懶回覆
