# Notion Formula 改造 — Session 進度交接

Last updated: 2026-05-29(Session B 結束)

## 整體目標

DB01-09 共 9 個 DB 加一組「儀表板介面欄位」(組合定義 / 資料檢核 / 狀態摘要 / 編輯紀錄 / 被引總數 / 時間進度 / 金額狀態 / 5 條社群指標 / 7 條財務指標),取代舊 232 條(已先砍至 ~170 條)散亂的 formula。

詳細設計見對話歷史。

## 當前 schema 狀態(已確認對齊 Notion live)

| DB | data_source_id | 進度 |
|----|---------------|------|
| **DB01 資源提案** | 722f2478-7e61-4b4b-ad1c-d171b4a639db | ✅ 砍 4 條毛利 + 加 4 條 🆕 + rename 完成 |
| **DB02 績效管考** | c286e19b-9cf8-422b-8628-98b6d116040c | ✅ 5 條完成 + rename 完成(舊_被引總數/舊_資料檢核 待 Noah 確認砍) |
| DB03 項目進度 | 968b23ea-da1f-4381-bd9a-253ee80b0656 | ⏳ 未開始 |
| **DB04 協作交接** | 5ad63416-a7c5-4d84-812e-cddf56c8bc01 | ✅ 5 條完成 + rename 完成(舊_被引總數 待 Noah 確認砍) |
| DB05 登記內容 | 28a667a9-ede1-466a-9f18-419da33a8810 | ⏳ 未開始(最大,~50 條組合定義) |
| **DB06 清單明細** | a809ff25-fdab-8236-b491-87496d236ac9 | ✅ 5 條 🆕 完成 + rename 完成 |
| DB07 庫存控管 | 0f5a87d4-d1df-4271-ba00-2abfee01693d | ⏳ 未開始 |
| **DB08 關係對象** | 6934a808-b79b-4446-98dd-f699476408a0 | ✅ 4 條 🆕 完成 + rename 完成(舊被引總數→舊_被引總數) |
| **DB09 日期紀錄** | 6547375e-ff14-4f24-ab0f-9f2a223a8580 | ✅ 4 條 formula + 5 條 rollup 全完成 |

### 已加的欄位明細

**DB09**(全部 rename 完成，無 🆕 記號):
- **Formulas**: 編輯紀錄、組合定義(完整 6 條 if 巢狀)、狀態摘要、資料檢核(簡版只判斷 title/紀錄類型/範圍日期)
- **Rollups(Session B 新加)**: 按讚總計、留言總計、分享總計、觸及總計、觀看總計(全走 `對應明細` → DB06，type=number，function=sum)
- **DB09 已砍**:跨類摘要、推廣總計、日期換算、星期換算

**DB06**(全部 rename 完成，無 🆕 記號):
- 售出小計、進貨小計、狀態摘要、資料檢核(簡版)、組合定義
- **DB06 舊欄位完全沒動**(包括跨類摘要 / 小計 / 收費小計 / 支出小計 / 預算總計 / 編輯紀錄 / 歸納主題 / 貨款折算)
- **DB06 社群源欄位已存在**:按讚 / 留言數 / 分享數 / 觸及人數 / 觀看次數(type=number，DB09 rollup 的源)

**DB08**(全部 rename 完成):
- 編輯紀錄、被引總數(新)、狀態摘要、組合定義
- **注意**:舊有的 `被引總數` formula 已被 rename 為 `舊_被引總數` 保留，新的才叫 `被引總數`；請 Noah 確認可砍後手動 DROP `舊_被引總數`
- **DB08 既有資料檢核**(已存在，不重加)

**DB01**(全部 rename 完成):
- 編輯紀錄、被引總數、狀態摘要、組合定義(9 條巢狀 if)
- **DB01 已砍**:預計毛利、預計毛利率、最後毛利、最後毛率(Noah 同意，財務改撥 DB02 統一)
- **DB01 既有保留**:執行預算、提案倒數、提案摘要、跨類摘要、資料檢核、被引總數

## Notion Formula DDL 真實 Syntax(踩過坑)

工具:`mcp__73449d04-...__notion-update-data-source`
DDL 範例:
```
ADD COLUMN "名稱" FORMULA('formula 表達式')
DROP COLUMN "名稱"
RENAME COLUMN "舊" TO "新"
ALTER COLUMN "名稱" SET FORMULA('新表達式')
```

ROLLUP DDL(Session B 首次實測，已確認可用):
```
ADD COLUMN "名稱" ROLLUP('relation欄位名', 'target欄位名', 'function')
```
例:
```
ADD COLUMN "🆕按讚總計" ROLLUP('對應明細', '按讚', 'sum')
```

語法注意:
- FORMULA 表達式用**單引號**包,內部用雙引號
- 中文欄位名、emoji(🆕)完全可用

### Notion Formula 真實 syntax(我親測)

| Syntax | 結果 | 替代方案 |
|--------|------|---------|
| `ifs(c1,v1,c2,v2,...)` | ❌ **type error** | 改巢狀 `if(c1, v1, if(c2, v2, ...))` |
| `or(a, b)` | ❌ type error | 用 `\|\|` |
| `and(a, b)` | 未測 | 預估改 `&&` |
| `empty(date 欄位)` | ✅ | — |
| `prop("select欄") == "字串"` | ✅(純 select) | — |
| `prop("rollup欄") == "字串"` | ❌ type error | 用 `contains(format(prop("rollup欄")), "字串")` |
| `prop("壞掉的 formula 欄")` | ❌ type error | 繞過,從 base 欄位重算 |
| 巢狀超過 4 層 + `\|\|` + 字串拼接 | ⚠️ 可能 type error | 拆 if 階段 |
| `DROP COLUMN` 批次 | ✅ **自動處理 view 同步**(比 Notion AI 強) | — |
| 批次 ALTER + ADD 引用同批新欄位 | ❌ race condition | 拆兩次發 |
| `ROLLUP('rel', 'prop', 'sum')` | ✅ **Session B 首次確認** | — |

### 已知陷阱

1. **DB06 上的 `小計` / `收費小計` / `支出小計` / `預算總計` formula 可能本身壞掉**(引用了 schema 上不存在的「費用類型」「登記單價」欄位)。新 formula 不要 `prop("小計")`,**從 base 欄位重算**:
   - DB06 真實 number base 欄位:登記售價、登記進價、登記數量、折扣、實際數量
   - DB06 真實 rollup「進出退換」(targetPropertyType=select):用 `contains(format(prop("進出退換")), "出貨")` 判斷
2. **MCP 看不到 formula 實際輸出** — 只回 `formulaResult://` URL。要 Noah 在 Notion UI 親自看。
3. **每次 DDL response dump 整個 schema(60-80K tokens)**。Session context 燒得快。9 個 DB 撐不完,要 session 接力。
4. **DB08 `被引總數` 命名衝突**:新欄位加時舊 formula 已存在同名。解法:先 RENAME 舊→`舊_被引總數`，再 RENAME 🆕→`被引總數`。Noah 確認後手動 DROP `舊_被引總數`。

## 共用 formula 模板(套用各 DB)

### 編輯紀錄(全 DB 通用)
```
"創建:" + format(prop("創建者")) + if(empty(prop("最後編輯")), "。", "，更新:" + format(prop("最後編輯")) + "。")
```

### 被引總數(全 DB 通用,需要 9 條 X被引 relation 都存在)
```
length(prop("提案被引")) + length(prop("管考被引")) + length(prop("項目被引")) + length(prop("協作被引")) + length(prop("內容被引")) + length(prop("明細被引")) + length(prop("庫存被引")) + length(prop("對象被引")) + length(prop("日期被引"))
```

### 資料檢核(簡版佔位,確認 syntax framework 後升級完整邏輯)
```
if(empty(prop("[title欄]")), "⚠️ 必填:[title欄名] | routing:嗨嗨總管", "")
```

完整版邏輯參照 v2 規格,但要小心 `||` 串 4+ 條件 + 字串拼接組合會 type error。先用簡版,後續拆 if 階段升級。

### 狀態摘要(每 DB 不同)
拼接該 DB 主狀態欄位用 ` ｜ ` 分隔。

### 組合定義
依 2-2-2 欄位組合指南(`35e9ff25fdab80269dc4f65a7ce83305`)該 DB 段條目,寫巢狀 `if()`。多入口平行(如 DB08)用拼接而非互斥 if。

## 下一個 Session 接力指南

### 先做什麼

1. **DB02 績效管考**(c286e19b-9cf8-422b-8628-98b6d116040c):fetch schema → 加 🆕編輯紀錄 / 🆕被引總數 / 🆕狀態摘要 / 🆕組合定義 / 🆕資料檢核 → 驗證 → rename

2. **DB04 協作交接**(5ad63416-a7c5-4d84-812e-cddf56c8bc01):fetch schema → 加 🆕編輯紀錄 / 🆕被引總數 / 🆕狀態摘要 / 🆕組合定義 / 🆕資料檢核 → 驗證 → rename

3. **DB03 項目進度**(968b23ea-da1f-4381-bd9a-253ee80b0656):同上步驟

4. **DB07 庫存控管**(0f5a87d4-d1df-4271-ba00-2abfee01693d):同上步驟

5. **DB05 登記內容**(28a667a9-ede1-466a-9f18-419da33a8810):最後做,最大(~50 條組合定義)

### 每個 DB 標準流程

1. fetch schema，找已有欄位名稱
2. 確認衝突(被引總數 最容易撞)
3. ADD COLUMN 5 條(🆕 前綴):編輯紀錄 / 被引總數 / 狀態摘要 / 組合定義 / 資料檢核
4. 驗證 response schema 中 🆕 欄位出現
5. RENAME 去掉 🆕(如有衝突先 rename 舊→舊_XXX)

### 共用 formula 各 DB 差異點

- **編輯紀錄**:全 DB 通用，直接套
- **被引總數**:需確認該 DB 上 9 條 X被引 relation 全部存在(可用 fetch schema grep `被引` 確認)
- **狀態摘要**:各 DB 主狀態欄位名不同，fetch schema 後決定
- **資料檢核**:各 DB title 欄位名不同(DB02 可能叫「管考名稱」)
- **組合定義**:各 DB if 邏輯不同，參照 2-2-2 指南

### Session 接力指令(Noah 開新 session 就貼這段)

```
讀 .claude/skills/check3-5/notion_formula_progress.md 接力 Notion formula 改造。
從「下一個 Session 接力指南」第 1 點開始做。
規則:用 🆕 前綴加新欄位、不主動砍舊欄位、每次 DDL 成功後驗證。
context 緊時優先 commit 進度文件再切 session。
```

## 連動 PR / commit 紀錄

Session A(2026-05-29 前半):
- DB01 加 4 條 🆕 + 砍 4 條毛利 + rename
- DB06 加 5 條 🆕(尚未 rename)
- DB08 加 4 條 🆕(尚未 rename)
- DB09 加 4 條 formula(尚未 rename)

Session B(2026-05-29 後半):
- DB06 完成 rename(5 條去 🆕)
- DB08 完成 rename(3 條去 🆕；舊被引總數→舊_被引總數，新🆕被引總數→被引總數)
- DB09 加 5 條 rollup(按讚/留言/分享/觸及/觀看 from `對應明細`→DB06) + 立即 rename 完成
- ROLLUP DDL syntax 首次實測確認可用
- DB02 加 5 條公式 + rename 完成(舊_被引總數/舊_資料檢核 保留待確認)
- 本次 session 沒改 repo 程式碼，只動 Notion live + 更新本 progress 文件
