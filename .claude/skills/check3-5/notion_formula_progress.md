# Notion Formula 改造 — Session 進度交接

Last updated: 2026-05-29(Session E 開始)

## 整體目標

DB01-09 共 9 個 DB 加兩波儀表板介面欄位，取代舊 232 條(已先砍至 ~170 條)散亂的 formula：

**Phase 1（已全部完成）**：編輯紀錄 / 被引總數 / 狀態摘要 / 資料檢核 / 組合定義

**Phase 2（本 session 開始）**：時間進度 / 金額狀態 / 5 條社群指標 rollup / 7 條財務指標

詳細設計見本文件下方 Phase 2 規格。

## 當前 schema 狀態

| DB | data_source_id | Phase 1 | Phase 2 |
|----|---------------|---------|---------|
| **DB01 資源提案** | 722f2478-7e61-4b4b-ad1c-d171b4a639db | ✅ 5條+rename | ⏳ 時間進度 + 社群×5 |
| **DB02 績效管考** | c286e19b-9cf8-422b-8628-98b6d116040c | ✅ 5條+rename | ⏳ **最先做**：時間進度+金額狀態+社群×5+財務A×6+財務B×3 |
| **DB03 項目進度** | 968b23ea-da1f-4381-bd9a-253ee80b0656 | ✅ 5條+rename | ⏳ 時間進度+金額狀態+社群×5+財務A×6 |
| **DB04 協作交接** | 5ad63416-a7c5-4d84-812e-cddf56c8bc01 | ✅ 5條+rename | ⏳ 時間進度+金額狀態+社群×5+財務A×6 |
| **DB05 登記內容** | 28a667a9-ede1-466a-9f18-419da33a8810 | ✅ 5條+rename | ⏳ 社群×5+財務A×6 |
| **DB06 清單明細** | a809ff25-fdab-8236-b491-87496d236ac9 | ✅ 5條+rename | — (DB06 是 rollup 的資料源，不加) |
| **DB07 庫存控管** | 0f5a87d4-d1df-4271-ba00-2abfee01693d | ✅ 5條+rename | ⏳ 社群×5+財務C×4 |
| **DB08 關係對象** | 6934a808-b79b-4446-98dd-f699476408a0 | ✅ 4條+rename | ⏳ 社群×5 |
| **DB09 日期紀錄** | 6547375e-ff14-4f24-ab0f-9f2a223a8580 | ✅ 5條+rollup×5 | ✅ 社群×5 已完成(Phase 1 時一起做) |

## Phase 2 規格

### A. 時間進度 formula（DB01–04）

```
if(empty(prop("起算日期")) || empty(prop("截止時間")), "—", if(now() < prop("起算日期"), "未開始", if(now() > prop("截止時間"), "已截止", format(round(dateBetween(now(), prop("起算日期"), "days") / dateBetween(prop("截止時間"), prop("起算日期"), "days") * 100)) + "%")))
```
- 欄位名：`時間進度`
- 注意：`起算日期`/`截止時間` 為各 DB 的 date 欄位；先 fetch schema 確認實際欄位名
- `or` → `||`（Notion 不支援 `or()`）

### B. 金額狀態 formula（DB02–04 only）

```
if(prop("預算總計") == 0, "預算未設定", if(prop("支出總計") <= prop("預算總計"), "✅ 符合預算(餘 " + format(prop("預算總計") - prop("支出總計")) + ")", "⚠️ 超支 " + format(prop("支出總計") - prop("預算總計"))))
```
- 欄位名：`金額狀態`
- 依賴：`預算總計` 和 `支出總計` rollup 必須先加（財務 A 組第 1+2 批）
- **實作順序**：先加財務 A 組 rollup → 驗證 → 再加此公式

### C. 社群指標 rollup × 5（DB01/02/03/04/05/07/08，DB09 已完成）

| 新欄位名 | rollup 來源 | DB06 target 欄位 | function |
|---------|-----------|-----------------|---------|
| 按讚總計 | 對應明細 | 按讚 | sum |
| 留言總計 | 對應明細 | 留言數 | sum |
| 分享總計 | 對應明細 | 分享數 | sum |
| 觸及總計 | 對應明細 | 觸及人數 | sum |
| 觀看總計 | 對應明細 | 觀看次數 | sum |

DDL 範例（先加 🆕 前綴，驗證後 rename）：
```
ADD COLUMN "🆕按讚總計" ROLLUP('對應明細', '按讚', 'sum')
ADD COLUMN "🆕留言總計" ROLLUP('對應明細', '留言數', 'sum')
ADD COLUMN "🆕分享總計" ROLLUP('對應明細', '分享數', 'sum')
ADD COLUMN "🆕觸及總計" ROLLUP('對應明細', '觸及人數', 'sum')
ADD COLUMN "🆕觀看總計" ROLLUP('對應明細', '觀看次數', 'sum')
```
- **注意**：各 DB 連到 DB06 的 relation 名稱可能不同（DB09 用 `對應明細`）；fetch schema 後 grep `明細` 確認

### D. 財務指標 A 組（DB02–05）— 6 條

先加 3 條 rollup，再加 3 條 formula（後者依賴前者）：

**Batch 1（rollup）**：
```
ADD COLUMN "🆕收入總計" ROLLUP('對應明細', '收費小計', 'sum')
ADD COLUMN "🆕支出總計" ROLLUP('對應明細', '支出小計', 'sum')
ADD COLUMN "🆕預算總計" ROLLUP('對應明細', '預算小計', 'sum')
```
- DB06 欄位名：`收費小計`（可能壞掉 formula，但作為 rollup target 應仍可讀）、`支出小計`、`預算小計`（注意：不是「預算總計」）
- 若 rollup 回 0 且懷疑 DB06 formula 壞掉 → 回報 Noah，改用 DB06 base 欄位（登記售價×數量 等）重新計算

**Batch 2（formula，依賴 Batch 1 rename 完成後才能加）**：
```
ADD COLUMN "🆕總和總計" FORMULA('prop("收入總計") - prop("支出總計")')
ADD COLUMN "🆕結算毛利" FORMULA('prop("預算總計") - prop("支出總計")')
ADD COLUMN "🆕結算毛利率" FORMULA('if(prop("預算總計") == 0, "—", format(round(prop("結算毛利") / prop("預算總計") * 10000) / 100) + "%")')
```
- **結算毛利率** 依賴 `結算毛利`（公式欄），同批加會有 race condition → 拆兩次 DDL

### E. 財務指標 B 組（DB02 only）— 3 條

**Batch 1（rollup）**：
```
ADD COLUMN "🆕提案營業額" ROLLUP('對應提案', '營業額', 'sum')
```
- DB02 需有 relation `對應提案` → DB01，且 DB01 有 `營業額` 欄位
- fetch DB02 schema 確認 relation 名稱

**Batch 2（formula）**：
```
ADD COLUMN "🆕預計毛利" FORMULA('prop("提案營業額") - prop("預算總計")')
ADD COLUMN "🆕預計毛利率" FORMULA('if(prop("提案營業額") == 0, "—", format(round(prop("預計毛利") / prop("提案營業額") * 10000) / 100) + "%")')
```

### F. 財務指標 C 組（DB07 only）— 4 條

**Batch 1（rollup）**：
```
ADD COLUMN "🆕售出總計" ROLLUP('對應明細', '售出小計', 'sum')
ADD COLUMN "🆕進貨總計" ROLLUP('對應明細', '進貨小計', 'sum')
```
- DB06 已有 `售出小計` 和 `進貨小計`（Phase 1 Session A 已加）

**Batch 2（formula）**：
```
ADD COLUMN "🆕商品毛利" FORMULA('prop("售出總計") - prop("進貨總計")')
ADD COLUMN "🆕商品毛利率" FORMULA('if(prop("售出總計") == 0, "—", format(round(prop("商品毛利") / prop("售出總計") * 10000) / 100) + "%")')
```

### Phase 2 執行順序

```
DB02 → DB03 → DB04 → DB05 → DB01 → DB07 → DB08
```

| DB | 要加的欄位組合 | 總欄位數 |
|----|-------------|--------|
| DB02 | 時間進度 + 金額狀態 + 社群×5 + 財務A×6 + 財務B×3 | 17 |
| DB03 | 時間進度 + 金額狀態 + 社群×5 + 財務A×6 | 14 |
| DB04 | 時間進度 + 金額狀態 + 社群×5 + 財務A×6 | 14 |
| DB05 | 社群×5 + 財務A×6 | 11 |
| DB01 | 時間進度 + 社群×5 | 6 |
| DB07 | 社群×5 + 財務C×4 | 9 |
| DB08 | 社群×5 | 5 |

### Phase 2 每個 DB 標準流程

1. fetch schema → grep 確認：`對應明細` relation 名稱、`起算日期`/`截止時間` 欄位名
2. grep 確認是否已有同名欄位（時間進度/金額狀態/按讚總計 等）→ 衝突的先 rename 舊_*
3. **Batch 1**：ADD 所有 rollup 欄位（🆕 前綴）→ 驗證 codeUrl
4. **Batch 2**：RENAME rollup 的 🆕 → plain（race condition 避免：先 rename rollup，再加依賴 rollup 的 formula）
5. **Batch 3**：ADD formula 欄位（🆕 前綴）→ 驗證 codeUrl
6. **Batch 4**：RENAME formula 的 🆕 → plain
7. 更新本文件 → commit → push

---

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

~~1. **DB02 績效管考**(c286e19b-9cf8-422b-8628-98b6d116040c)~~ ✅ Session B 完成

~~2. **DB04 協作交接**(5ad63416-a7c5-4d84-812e-cddf56c8bc01)~~ ✅ Session C 完成

~~3. **DB03 項目進度**(968b23ea-da1f-4381-bd9a-253ee80b0656)~~ ✅ Session C 完成

~~4. **DB07 庫存控管**(0f5a87d4-d1df-4271-ba00-2abfee01693d)~~ ✅ Session D 完成

~~5. **DB05 登記內容**(28a667a9-ede1-466a-9f18-419da33a8810)~~ ✅ Session D 完成

**🎉 Phase 1 全部 9 個 DB 已完成！Phase 2 開始執行中...**

### Phase 2 進度（接力指南）

⬅️ **下一個 Session 從 DB02 Phase 2 開始**，按上方「Phase 2 執行順序」表格進行。

### 每個 DB Phase 1 標準流程（已完成，僅供參考）

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
從「Phase 2 進度（接力指南）」找到下一個未完成的 DB 開始做。
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

Session C(2026-05-29 Session C):
- DB04 協作交接 加 5 條 🆕 + rename 完成(舊_被引總數 保留待 Noah 確認砍)
- DB03 項目進度 加 5 條 🆕 + rename 完成(舊_被引總數/舊_資料檢核 保留待 Noah 確認砍)
- 本次 session 沒改 repo 程式碼，只動 Notion live + 更新本 progress 文件

Session E(2026-05-29 Session E):
- Phase 2 規格確立：時間進度/金額狀態/社群×5/財務A×6/財務B×3/財務C×4
- 更新進度文件，開始執行 DB02 Phase 2

Session D(2026-05-29 Session D):
- DB07 庫存控管 加 5 條 🆕 + rename 完成(舊_被引總數/舊_資料檢核 保留待 Noah 確認砍)
  - 組合定義邏輯：if 庫存類型=商品 → 【商品】+主題名稱+商品選項；耗材→【耗材】；設備→【設備】
- DB05 登記內容 加 5 條 🆕 + rename 完成(舊_編輯紀錄/舊_被引總數/舊_資料檢核 保留待 Noah 確認砍)
  - 組合定義邏輯：if 內容類型=內容素材 → 【素材】+文案選項；報名登記 → 【報名】+登記類別；共識互動 → 【共識】+共識選項
- **全部 9 個 DB 完成！**
- 本次 session 沒改 repo 程式碼，只動 Notion live + 更新本 progress 文件
