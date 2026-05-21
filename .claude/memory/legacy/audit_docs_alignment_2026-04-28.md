---
name: 文件對齊稽核 2026-04-28
description: 比對本地 .md 與 Notion 指南頁面的不一致、命名差異、缺漏與建議更新
type: project
date: 2026-04-28
originSessionId: 47ca24e6-1af8-40cb-8bf2-db080f8efa4e
---

> ⚠️ **[LEGACY]** 2026-04-28 稽核報告，已被 `audit_docs_alignment_2026-04-29_v3.md` 取代。所述 DB 短名（共識交接協作 / 登記表單明細 / 庫存資產 / 範圍日期）為當時舊名，現已多輪改名。

# 文件對齊稽核報告

## 稽核範圍
- 本地：`/Users/jay049/CLAUDE.md`、`makesense-ink/CLAUDE.md`、`memory/notion_structure.md`、`memory/MEMORY.md`
- Notion 指南頁面：系統總論、資料庫類別、組織架構、文案撰寫、圖像製作、各類指南總頁、官網維護、官網內容撰寫
- 注：「文案撰寫指南」與「官網內容撰寫指南」實際 fetch 回的是 DB06/官網維護的延伸內容（過大被截斷），僅就可讀部分比對。

---

## (a) 嚴重衝突（會誤導決策）

### A1. DB 名稱對應 — 三組來源完全不同
| 來源 | DB04 | DB05 | DB07 | DB09 |
|------|------|------|------|------|
| 本地 `/Users/jay049/CLAUDE.md`（4/25 校正） | 協作交接 | 登記表單 | 庫存控管 | 日期紀錄 |
| Notion 系統總論／資料庫類別指南 | 共識交接協作 | 登記表單明細 | 庫存資產 | 範圍日期 |
| 本地 `makesense-ink/CLAUDE.md` | 共識交接協作 | 登記表單明細 | 庫存資產 | 範圍日期 |
| Notion 實際 DB 標題（fetch 結果） | DB04（→ collection 名同舊版） | DB05（同） | DB07（同） | **DB09日期紀錄** |

**衝突點**：`CLAUDE.md` 自稱「以 Notion 為單一真相來源」並把名稱改短，但 Notion 指南頁與 makesense-ink CLAUDE.md 仍用長名。Notion DB09 的實際 title 是「DB09日期紀錄」（短名），證明 `/Users/jay049/CLAUDE.md` 的方向正確、但 Notion 指南頁面尚未跟上。

**該以哪份為準**：以 Notion 各 DB 實際 title 為準（短名：項目進度、協作交接、登記表單、庫存控管、日期紀錄）。makesense-ink 程式對應表與所有 Notion 指南頁面都需要更新。

### A2. 軸別歸屬 — DB05 vs DB06/07/08 有兩種說法
- **本地 `/Users/jay049/CLAUDE.md`**：DB05 是「XY 交會原子層」，**DB06、DB07、DB08 是 Y 軸主力**。
- **Notion 系統總論／資料庫類別指南**：DB**05、06、07、08 全部是 Y 軸主力**，DB05 是「兩條軸共同的原子資料層」。
- **資料庫類別指南五節定義**：DB07 寫成「商業產品層」，但實際 DB07 的 title 是「庫存控管」；DB08 描述「整併自原『關係經營』與『關係經營（主題標籤）』」是更早期的歷史，可能誤導新讀者以為現在還要區分兩種次分類。

**衝突點**：本地把 DB05 拉出 Y 軸，Notion 把 DB05 算進 Y 軸；指南文字的「主力資料庫」清單跟標題不一致（一處寫 DB05+06+07+08，一處只說 DB05 是交會點）。

**該以哪份為準**：建議統一寫成「DB05 是 XY 共用原子層；DB06/07/08 是 Y 軸主力」（即本地 CLAUDE.md 的版本），最直觀。

### A3. AI 代理欄位（昨晚新增）— 所有指南都沒提
從 fetch DB09 與 DB06 的 schema 看到大量 `ai企劃 / ai分析 / ai搜查 / ai文案 / ai聯想 / ai進度` + 各自備註欄位、`ai_meta`、`ai_對應對象`、`ai_對應標籤` 等共 12+ 個 AI 欄位（status / text / relation 各種型別）。

- **本地 4 個 .md 全部沒有提到這 12 個 AI 欄位**（只有 notion_structure.md 提到 DB07 的 `ai_對應作者/ai_對應標籤/ai_對應發行` 三個 relation；其他 9 個一字未提）
- **Notion 系統總論／資料庫類別指南**也都沒提 — 但「資料庫類別指南」第六節「三道關鍵欄位」中明確列了 `ai_meta` 是第三道，這還停在舊版（只 1 個 AI 欄位）

**衝突點**：使用者昨晚剛改完，所有指南都還沒同步。AI 寫 workflow 時不知道有這些 status 欄位可以用，會做白工。

**該以哪份為準**：**Notion 實際 schema**（fetch 結果）。所有文件都必須補。

### A4. DB04「交接類型」選項 — 三種版本
- **本地 notion_structure.md**：專案協作 / 庫存門市
- **Notion 資料庫類別指南**第四節：專案協作 / 庫存門市 / **共識互動**（多一項）
- **本地 MEMORY.md** 沒提

**衝突點**：少一個選項，Y 軸 DB05「共識互動」表單到底有沒有對應 DB04 的同名類型，不一致。

### A5. DB07「商品選項」選項數量
- **本地** 一律寫 3 個：選書 / 選物 / 數位（票券放數位細項）
- **Notion 資料庫類別指南**第四節：「選書 / 選物 / 數位（票券放數位細項=票券）」— 已對齊 ✓
- **Notion 資料庫類別指南**第五節 DB06（指 DB07 庫存）描述：仍用舊版「實體商品、設備、耗材、文宣品、公關品，以及數位產品」描述邏輯，沒對齊新的 3 大類

**該以哪份為準**：以本地 + 第四節為準（3 大類）。第五節要重寫。

### A6. 庫存異動規則 — DB05 → DB06 連結欄位不一致
- **本地 CLAUDE.md / notion_structure.md**：DB05 → DB06 用「對應明細」（相對應「對應庫存→DB07」走 DB05 自己的 relation）
- **Notion 官網維護指南**：「DB05 ... → 對應明細 → DB06（明細類型=庫存紀錄、登記數量、對應庫存→DB07）」— 一致 ✓
- 但本地 makesense-ink CLAUDE.md 的「庫存異動規則」**只寫到 DB06**，沒寫 DB05→DB06 是經由哪個 relation 欄位

不算嚴重衝突，但 makesense-ink 的描述太簡略，會讓寫 sync workflow 的人猜。

---

## (b) 命名差異（純改名，意義相同）

| 主題 | 本地說法 | Notion 指南說法 | 備註 |
|---|---|---|---|
| DB03 | 項目進度（CLAUDE.md）／ 工作項目進度（其他） | 工作項目進度 | Notion 實際 title=「DB03 項目進度」短名 |
| DB04 | 協作交接 / 共識交接協作 | 共識交接協作 | Notion 實際 title=「DB04 協作交接」 |
| DB05 | 登記表單 / 登記表單明細 | 登記表單明細 | Notion 實際 title=「DB05 登記表單」 |
| DB07 | 庫存控管 / 庫存資產 | 庫存資產 | Notion 實際 title=「DB07 庫存控管」 |
| DB09 | 日期紀錄 / 範圍日期 | 範圍日期 | Notion 實際 title=「DB09日期紀錄」 |
| DB06 大分類 | 「明細類型」 | 「明細類型」 | 一致 ✓ |
| DB05 大分類 | 「表單類型」 | 「表單類型」 | 一致 ✓ |
| DB08 經營類型 = 紀錄 / 標籤 / 觀點 | 一致 ✓ | 一致 ✓ | 但**資料庫類別指南**第五節 DB07（指 DB08 關係）仍寫舊次分類「網站帳號／合作單位／個人／觀點議題／空間地點」，已過時 |
| DB05 連 DB08 | 「對應對象」 | 一致 ✓ | |
| DB06 連 DB08 | 「對應標籤對象」 | 一致 ✓ | DB06 schema 也另有 `ai_對應對象`、`ai_對應標籤` |
| 圖像製作指南 步驟 | photo_processor 走 10 步驟（discord） | Notion 寫 6 步驟（n8n + Telegram） | 不算改名，Notion 已是新 n8n 規劃，本地 CLAUDE.md 仍寫舊 10 步驟 → 應對齊到 Notion 6 步驟版（見 D1） |

---

## (c) 缺漏（一邊有、一邊沒）

### Notion 指南有、本地沒有
- **C1. 「三道關鍵欄位」機制**（資料庫類別指南第六節）：摘要簡介 / 對應標籤 / ai_meta — 本地完全沒記。這是跨 DB 通用的官網內容辨認邏輯。
- **C2. 收入結構**（資料庫類別指南第二節）：兩條收入線（DB01「營業額」+ DB05「小計／總計」）以「現思文化創藝術有限公司」DB08 為錨點 Rollup — 本地沒記，影響財務查詢。
- **C3. 三軸正交組合說明**（資料庫類別指南第四節）：DB01 提案類型 × DB02 專案類型 × DB03 項目類型 完全獨立可自由交叉 — 本地完全沒寫。
- **C4. DB06 page_templates**：Notion 實際有 7 個模板（參考明細／聯繫明細／登記明細／圖文明細／庫存明細／費用明細／工作紀錄）— 本地沒列。
- **C5. DB06「互動選項」**選項：內部共識／聯繫互動／行政事務（描述顯示「聯繫互動」未來改「外部聯繫」）— 本地 notion_structure.md 只在 DB05 提互動選項，沒寫 DB06 也有。
- **C6. DB06「下架備項」「商品認列」「參考類型」「參考標籤」「區塊備忘」「協作參考」**等大量 select 欄位 — 本地完全沒列。
- **C7. 圖像製作指南**：Cloudinary 資料夾結構（DB02/DB03/DB04 三層命名規則）、缺層規則 — 本地 CLAUDE.md 第 7 步驟雖提 Cloudinary 但沒寫資料夾規則。
- **C8. 各類指南總頁**列了 30+ 個工作執行 / 文案 / 報表指南頁面（含 LINE 官方帳號、活動辦理、會員關係等），本地 4 個 .md 一個都沒索引。

### 本地有、Notion 指南沒有（或更新）
- **C9. AI 代理欄位**（A3 已述）— 本地也沒有，但 Notion 指南更該補。
- **C10. makesense.ink 技術細節**（next-intl、Cloudinary CDN proxy、JSON-LD、RSS、partner_applications 表、line_message_log 表等）只在本地 makesense-ink/CLAUDE.md，Notion 官網維護指南沒提。
- **C11. n8n single-sync webhook URLs**（DB04~DB08 的 5 條 zeabur webhook）— 只在本地 makesense-ink/CLAUDE.md，Notion 官網維護指南沒列。
- **C12. DB05「圖像備項」「文案細項」「文書類型」「聯繫細項」「通知細項」「社群頻道」「社群備項」「官網備項」「簡介摘要」**等欄位 — 本地 notion_structure.md 有列；Notion 資料庫類別指南只描述軸別歸屬，沒這些欄位細節。
- **C13. Telegram Bot 取代 Discord Bot** — 本地三份 .md 都明說「Discord Bot 已取消，改 Telegram」，但 Notion **系統總論指南**仍寫「Discord 伺服器：AI溝通台」與「嗨嗨 Bot ID `1484379614720561333`」，已過時 1 週以上。
- **C14. makesense.site 已退役** — 本地三份 .md 明確標註，Notion 沒任何指南頁宣告退役（系統總論還寫 WP 舊架構）。

---

## (d) 建議更新動作清單（優先序）

### 高優先（本週內）
1. **Notion 系統總論指南** — 刪掉整段「Discord 伺服器：AI溝通台」+「嗨嗨 Bot」，改寫為 Telegram Bot；說明 Discord 已停用（C13）。
2. **Notion 資料庫類別指南第五節**：把 DB06/07/08 的描述用 Notion 實際 title 與當前 schema 重寫（A1+A5+B 表）；DB07 部分仍寫「商業產品層／實體商品設備耗材」要改為 3 大類「選書／選物／數位」；DB08 整段「次分類欄位『關係選項』（網站帳號／合作單位／個人／觀點議題／空間地點）」改為現行「個人／合作夥伴／工作團隊」。
3. **所有四份本地 .md** + **資料庫類別指南第六節**：補 12 個 AI 代理欄位（ai企劃/分析/搜查/文案/聯想/進度 + 備註 + ai_meta + ai_對應對象 + ai_對應標籤）（A3）。
4. **本地 `/Users/jay049/CLAUDE.md`** + **Notion 圖像製作指南**：對齊照片流程（10 步驟 Python 版 vs 6 步驟 n8n 版），統一表述目前是哪一版在跑（從 fetch 看 Notion 寫「待建置 n8n workflow」→ 應在本地 CLAUDE.md 標註「目前仍跑 Python 10 步驟，n8n 版規劃中」）（B 表最後一列）。
5. **本地 makesense-ink/CLAUDE.md**：把 DB 名統一改為 Notion 實際短名（A1）；DB07 描述補上「庫存控管」title 與商品選項只剩 3 類（A5）。

### 中優先
6. **Notion 資料庫類別指南**：DB04 交接類型加上「共識互動」第三選項（A4）；本地 notion_structure.md 同步補。
7. **本地 notion_structure.md**：補進 DB06 7 個 page_templates、互動選項、下架備項、商品認列、參考類型、區塊備忘等欄位（C4~C6）。
8. **本地 4 份 .md**：把「三道關鍵欄位」「收入結構錨點」「三軸正交組合」三個概念抄一份進來（C1~C3）。
9. **Notion 官網維護指南**：補 5 條 n8n single-sync webhook URLs、partner_applications、line_message_log、translations 等 Supabase 表（C10~C11）。

### 低優先（清理）
10. **MEMORY.md**：清掉「## 官網系統（makesense.site）— WP 舊站」整段（已退役、makesense_ink 已是主力）；保留歷史交接 .md 連結即可，避免新 session 誤把舊規格當現行。
11. **Notion 各類指南總頁**：把指南順序按「現行 / 舊版 / 待建置」標籤分組；現在 30+ 條混在一起，新 session 無法快速判斷哪些是現行有效。
12. **本地 CLAUDE.md 與 makesense-ink/CLAUDE.md**：在開頭加上「DB 名稱對照表（短名 vs 舊長名）」一張，所有舊 .md 都對得回來，避免 A1 持續發生。

### 同步治理建議
13. 為「指南與本地 .md 對齊」建立月度檢查節奏（例：每月 1 號跑此 audit），避免使用者改 schema 後文件落後超過 7 天。
14. 在 Notion DB（特別是 DB05/DB06/DB07/DB08）的 description 欄位加註「最後 schema 變更日期」，讓 audit 工具能優先 diff 變動最大的 DB。
