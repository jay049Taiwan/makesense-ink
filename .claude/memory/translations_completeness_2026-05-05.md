# Translations 表完整度稽核 — 2026-05-05

## 總結
**translations 表完全是空的（0 筆）**。中英日韓多語系統未啟動任何資料。

## 資料規模
| 表 | 全部 rows | status=active | en | ja | ko |
|---|---|---|---|---|---|
| products | 5,371 | 78 | 0 (0%) | 0 (0%) | 0 (0%) |
| events | 761 | 30 | 0 (0%) | 0 (0%) | 0 (0%) |
| articles | 1,905 | 0 | — | — | — |
| topics | 595 | 595 | 0 (0%) | 0 (0%) | 0 (0%) |

translations 表總筆數：**0**

## 觀察
1. **translations 表 schema 正確**（id, table_name, row_id, locale, field, value, created_at, updated_at），但完全沒有資料寫入過。
2. **articles status=active 為 0**：1,905 筆全部處於非 active 狀態（草稿/下架？）。
3. **products 只有 78/5,371 active**：active 比例極低（1.5%），其餘可能為 OneDrive 遷移過去的庫存資料但未發佈上架。
4. **topics 全 595 都 active**：標籤/觀點全數啟用。
5. 無孤兒、無重複（因為無資料）。

## 應翻範圍（active 資料）
- products: 78 × 2 欄位（name, description）× 3 語 = 468 筆
- events: 30 × 2 欄位（title, description）× 3 語 = 180 筆
- topics: 595 × 2 欄位（name, summary）× 3 語 = 3,570 筆
- articles: 0（無 active）
- **合計約 4,218 筆翻譯**

## 成本估算（Claude Haiku）
平均每筆 ~200 tokens 輸入 + ~150 輸出，4,218 筆約 ~150 萬 tokens。Haiku 約 US$1-2 內可全部翻完。

## 建議優先順序
1. **Topics（觀點/標籤）優先**：對 SEO 與導覽影響最大（595 筆全 active），且文字短、翻譯快、便宜。
2. **Products active 78 筆**：商城頁面實際露出的商品，影響使用者直接體驗。
3. **Events active 30 筆**：活動頁面實際露出，影響報名轉換。
4. **Articles 暫不需要**：無 active 資料。

## 待確認
- 多語系前端是否真的有在跑？若有跑但 translations 空，UI 應全部 fallback 到中文 — 用戶實際看到 EN/JA/KO 切換有作用嗎？
- 是否曾經有自動翻譯 worker？若有，為何沒寫入過任何一筆？（可能 cron 沒啟、API key 未設、或從未觸發）
- 建議：先批次翻 topics + products active + events active（成本低、覆蓋率立即從 0% 拉到 100% active），再評估是否要把 inactive 也翻。
