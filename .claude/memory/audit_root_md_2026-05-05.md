> ⚠️ **2026/05/09 標註**：此為歷史稽核報告（2026-04-28 ~ 2026-05-05 期間產出）。所述「現行」schema 已於 2026/05/06~05/08 大幅改名（互動選項→互動類別、登記選項→登記類別、文案細項→文案選項、內容選項→素材類別、預約報名→填寫報名、請款請購→紀錄費用、活動細項→活動選項、走讀行旅→導覽走讀、紀錄備項→紀錄細項；DB05 大分類「圖文影音」→「內容素材」）。**僅供歷史脈絡，不要當作現行 schema 依據；現況以 MEMORY.md / makesense-ink/CLAUDE.md 為準**。

---

# makesense-ink 根目錄 .md 稽核 — 2026-05-05

對照來源：`makesense-ink/CLAUDE.md`（已對齊真相）

## 1. README.md
- 內容：純 Next.js create-next-app 樣板，無系統內容。
- 動作：**不需修改**。

## 2. AGENTS.md
- 內容：僅 Next.js agent rule 提示。
- 動作：**不需修改**。

## 3. DATA_LAYER_HANDOFF.md
問題（致命，整份過時）：
- DB05 名稱寫「登記表單明細」（應為「登記表單」）
- DB07 概念以舊「庫存資產」基礎推導
- 規劃 6 張表 `vendor_products` / `market_events` / `market_vendor_slots` / `market_slot_products` / `activity_addon_products` / `preorders`，**均未建立**；實際採用 `products` + `events` + `vendor_preorders/items` + `market_applications`
- API routes 7 條全未實作（實際走 /api/sync, /api/checkout, /api/orders 等）

修了 2 處：
- 檔頭加入 deprecation banner，列出實際採用的表與名稱差異
- 「DB05 登記表單明細」→「DB05 登記表單」

保留沒動：六張未建立表的 SQL、四節對照表（保留作歷史脈絡，banner 已警示）

## 4. TELEGRAM_SYNC_HANDOFF.md
問題：
- DB 短名全用舊版（DB03 工作項目進度/DB04 共識交接協作/DB05 登記表單明細/DB07 庫存資產/DB09 範圍日期）
- 五個 Tab 把「考勤」當作 Tab 名（現為「紀錄」），費用 Tab 對應 DB 也錯（標為 DB06，實為 DB05 請款請購）

修了 3 處：
- Tab 表更新為「紀錄」+ 修正各 Tab 對應 DB（紀錄→DB05 紀錄備項+staff_activities、費用→DB05 請款請購、動態/庫存→DB07 庫存控管）
- ASCII Tab Bar `⏰考勤` → `📓紀錄`
- DB 對照表全部改為新短名（項目進度/協作交接/登記表單/庫存控管/日期紀錄）

保留沒動：「目前狀態：mock data + 尚未實作」段落（Telegram Bot 同步本來就還未實作，敘述仍然成立）；DB05 重要欄位 4 行（與現況一致）

## 5. MEMBER_SESSION_HANDOFF.md
問題（輕，多為歷史對照本來就提到 WP/WooCommerce）：
- 工作台 Tab 寫「⏰ 考勤 — 打卡/日誌/請假/加班/班表」（現為「📓 紀錄」）
- WP/WooCommerce 字樣出現於「舊版 vs 新版」遷移對照表，屬合理歷史脈絡

修了 1 處：
- ⏰ 考勤 → 📓 紀錄

保留沒動：WP→Vercel 遷移對照表、Supabase 表清單（與現況一致，雖未列 point_ledger/staff_activities/vendor_preorders 等新表，屬資訊缺漏非錯誤）

## 6. PRE_LAUNCH_STATUS.md
- 全文以 2026/04/20 時間戳明確自陳為 session 10 結束狀態，且後續 Member/Partner session 完工事項在 CLAUDE.md 補充更新區已記載。
- 不存在 DB 名稱錯、WP 殘留、Discord 殘留、DB04 欄位錯誤等致命漂移。
- 動作：**保留沒動**（屬歷史快照文件，不應改寫）。

## 整體結論
- 5 份檔案中 README/AGENTS 為樣板/單行；DATA_LAYER_HANDOFF 與 TELEGRAM_SYNC_HANDOFF 是漂移最嚴重者，已加 deprecation 或就地修正；MEMBER_SESSION/PRE_LAUNCH 為歷史快照，僅微調。
- 共修 6 處編輯（DATA_LAYER 2 / TELEGRAM_SYNC 3 / MEMBER_SESSION 1）。
- 未發現 Discord Bot 殘留、未發現 makesense.site/WooCommerce 作為現行假設（僅在歷史對比中合理出現）。
