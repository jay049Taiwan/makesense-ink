---
type: audit
date: 2026-04-29
scope: 文件矛盾、多餘重複、無用規範稽核
originSessionId: 47ca24e6-1af8-40cb-8bf2-db080f8efa4e
---

> ⚠️ **[LEGACY]** 2026-04-29 稽核報告，schema 已多輪改名（2026/05/06~05/08），舊欄位名（如 進銷明細 / 庫存資產 / 關係經營）僅供歷史脈絡。已被 audit_docs_alignment_2026-04-29_v3.md 等後續報告取代。

# 文件問題稽核報告 2026-04-29

## (a) 論述矛盾

### A1. 指南頁第五節「資料庫定義」DB 編號整體錯位（嚴重）
- **位置**：Notion 資料庫類別指南 `3279ff25fdab80a18fffff56c578a86a` 第五節 `各資料庫定義` 表格
- **問題**：表格 `#` 欄位 06 row 嵌入的 mention-page 是 DB07 庫存控管 page (`1a7e3684...`)；07 row 是 DB08 關係經營 (`87397018...`)；08 row 是 DB09 日期紀錄 (`b10ed6ed...`)。表格少了 DB06 進銷明細的條目，但下面又把 DB06 的描述（「商品產品層」「售價／進價／條碼」）寫在編號 06 那一格 — 結果 DB06 完全沒有獨立定義，DB07~DB09 的編號全錯一格。
- **影響**：AI 讀指南學系統時會把 DB06 當成 DB07，內容描述跟編號全錯位。本檔自稱「供 Claude / Notion AI 使用」，這是直接餵錯資訊。
- **建議**：重排表格 — 補一列 `06 進銷明細`，把 `庫存控管` 描述歸 07，`關係經營` 歸 08，`日期紀錄`（或範圍日期）歸 09。

### A2. 收入結構錨點寫成 DB06，應為 DB08
- **位置**：同上指南第二節「收入結構說明」
- **問題**：原文「應以 DB 06「互動關係經營」中的『現思文化創藝術有限公司』為錨點」。但「互動關係經營/現思文化創藝術有限公司」實際在 **DB08 關係經營**。指南第五節又把 DB07 寫成「整併自過去多個關係經營資料庫」，再次與當前 schema 不符（DB08 才是關係經營）。
- **建議**：改 DB06→DB08。

### A3. DB04「對應辦理單位」vs makesense-ink 程式仍找「對應發佈單位」
- **位置**：`makesense-ink/app/api/sync/single/route.ts:205`（在 audit_db_schema_2026-04-28.md 已紀錄但未修正）
- **問題**：DB04 schema 實際欄位名為「對應辦理單位」，程式仍用舊名「對應發佈單位」，每次同步 events.related_partner_ids 都缺值。
- **建議**：立即改程式名稱。

### A4. project_architecture.md 標 LEGACY，但 Discord 頻道命名表仍當現行
- **位置**：`memory/project_architecture.md` 第 3、9-12 行已加 LEGACY 標籤，但第 14-40 行整段 17 頻道 + 4 分類表、64-67 行「Claude API 模型分級」仍按現行格式列。
- **問題**：新 session 半信半疑：明明說 Discord 已退役，但檔案主體仍像現行規範。
- **建議**：把 17 頻道清單與「Opus/Sonnet/Haiku」分配整個區塊收進 `<details>` 或前置「以下為 2026/04 前歷史」一句。

### A5. 兩個 CLAUDE.md 的 DB 名稱不一致
- **位置**：`/Users/jay049/CLAUDE.md`（DB04=協作交接、DB07=庫存控管、DB09=日期紀錄）vs `makesense-ink/CLAUDE.md` 的 Notion 資料庫表格（DB04=協作交接、DB07=庫存控管 — 這部分一致；但「DB03 工作項目進度」用長名）。
- **問題**：根 CLAUDE.md 用短名（項目進度），makesense-ink CLAUDE.md 用長名（工作項目進度）。雖然指向同一個 DB，但兩處對外露出時不統一。
- **建議**：兩份 CLAUDE.md 統一 Notion 短名（與 Notion 實際 title 對齊）。

### A6. 圖像製作指南 vs 根 CLAUDE.md 步驟數不一致
- **位置**：Notion 圖像製作指南 `3299ff25fdab8040bcaad28122bebff8`（6 步驟，n8n + Cloudinary 為主）vs `/Users/jay049/CLAUDE.md` 的「照片處理流程（10 步驟）」（watchdog + 本地 Pillow + 4 種預設縮圖 + 浮水印固定 logo）
- **問題**：兩份描述的是不同實作世代。Notion 圖像指南已是 n8n 規劃版，但根 CLAUDE.md 寫的是舊版 photo_processor。photo_workflow_progress.md 又顯示 n8n v4.1 已啟用 — 也就是說根 CLAUDE.md 的 10 步驟是過期描述。
- **建議**：根 CLAUDE.md 改寫為「目前實際以 n8n v4.1 跑（見圖像指南），photo_processor 本地版為 backup」。

### A7. line_integration_handoff.md 多項已完成寫成「待確認」
- **位置**：`memory/line_integration_handoff.md` 第 36-44 行「待確認/待做」清單
- **問題**：MEMORY.md 與 makesense-ink CLAUDE.md 都明確說 LINE 全套完成（含 Rich Menu、模擬器、Webhook、AI 客服）。此檔仍把「Rich Menu 按鈕功能測試 / AI 客服測試 / 訂單推播測試」列為待做，與 makesense_ink_supabase_migration_done 的「已完成」說法不一致。
- **建議**：勾掉已驗的、留下真的還沒驗的；或改寫成「LINE 後台側待確認事項」清楚分流。

---

## (b) 多餘重複（同一件事 ≥3 處）

### B1. 8 個 Notion 指南頁面 ID
- **重複處**：根 CLAUDE.md（第 65-71 行）、MEMORY.md（第 25-32 行）、project_architecture.md（第 69-76 行），三份都把 `2869…/3279…/3289…/3279…/3299…/2799…/32c9…/3329…` 8 個 ID 各列一次。
- **建議**：留 MEMORY.md 一份為單一真相，其他兩處改成「見 MEMORY.md」。project_architecture.md 已 LEGACY，不需要再列。

### B2. 「庫存異動唯一規則」（DB05+登記選項=紀錄庫存+庫存細項=進貨/出貨/盤點 → DB06）
- **重複處**：根 CLAUDE.md、MEMORY.md、notion_structure.md、makesense-ink/CLAUDE.md、ticket_product_model.md、audit_db_schema_2026-04-28.md — 六處各寫一遍幾乎相同的句子。
- **建議**：留 notion_structure.md 一份為單一真相，其他都改「見 notion_structure.md 庫存異動規則」。

### B3. 「DB05 連 DB08 用『對應對象』；DB06 連 DB08 用『對應標籤對象』」
- **重複處**：根 CLAUDE.md、MEMORY.md、notion_structure.md、makesense-ink/CLAUDE.md、audit_db_schema_2026-04-28.md。
- **建議**：留 notion_structure.md，其他改連結引用。

### B4. 「dlib 無法在 Mac 編譯，改用 deepface」
- **重複處**：根 CLAUDE.md（技術環境）、MEMORY.md（注意事項）、project_architecture.md、photo_workflow_progress.md、Notion 圖像製作指南。
- **建議**：留圖像製作指南一份，本地 .md 都引用 Notion 連結。

### B5. 「Footer 四頁面上下半部」
- **重複處**：makesense-ink/CLAUDE.md（第 82-104 行）、page_structure_footer_pages.md、MEMORY.md 第 88 行也提了一筆 — 本身有專屬檔案 page_structure_footer_pages.md，但 makesense-ink/CLAUDE.md 又抄了完整表格。
- **建議**：makesense-ink/CLAUDE.md 改成單一句「見 memory/page_structure_footer_pages.md」。

### B6. Rich Menu 六宮格
- **重複處**：makesense-ink/CLAUDE.md（第 410-419 行）、line_integration_handoff.md（第 73-77 行）、MEMORY.md 提及。
- **建議**：留 line_integration_handoff.md 為單一真相（檔名意圖即是），makesense-ink CLAUDE.md 改連結。

### B7. n8n single-sync webhook URLs（DB04~DB08 五條 zeabur URL）
- **重複處**：makesense-ink/CLAUDE.md（第 367-372 行）、makesense_ink_supabase_migration_done.md（第 28-33 行）。
- **狀態**：兩處重複；尚未 ≥3，但 webhook URL 是高風險變更項目，建議現在就統一。
- **建議**：留 makesense_ink_supabase_migration_done.md 一份，CLAUDE.md 改連結。

---

## (c) 無用規範（指向已退役系統 / 已不存在欄位 / 已過時流程）

### C1. project_architecture.md 整份描述 Discord 17 頻道 + L1~L5 模型分級
- **檔案**：`memory/project_architecture.md` 全檔
- **問題**：Discord Bot 已退役。整份的具體規則（哪頻道用 Opus / Sonnet / Haiku、頻道命名）已沒有任何系統會 enforce，純垃圾。
- **建議**：刪除整份檔案，或縮成 5 行「歷史紀錄：曾有 Discord 17 頻道 + L1~L5 分層 Bot，2026/04 退役」。

### C2. website_system.md / market_booking_progress.md / snippet_audit_plan.md / website_header_footer_done.md / cultureclub_calendar_blocked.md / calendar_unified_spec.md
- **檔案**：6 份 makesense.site WordPress 相關 .md
- **問題**：全部已標 LEGACY，但 MEMORY.md 仍把它們當「官網系統」區塊列引用（第 130-138 行），新 session 仍會被 ls 到、被讀。WP 已退役，這些 SSH 帳號、snippet ID、LiteSpeed 設定、PageSpeed 數據完全沒有應用場景。
- **建議**：移到 `memory/legacy/` 子資料夾，從 MEMORY.md 主索引刪除（保留歷史可見即可）。

### C3. Notion 系統總論指南仍寫 makesense.site WP 架構
- **檔案**：Notion `2869ff25fdab80c6a266f1228f8bd587`（從本次 fetch 看，提及 Telegram 已更新；但根據 audit_docs_alignment_2026-04-28 第 108 行說此頁仍寫 WP 與「嗨嗨 Bot ID」— 需以 audit 上次紀錄為準，本次 fetch 的內容已經修過 Telegram 段，但延伸閱讀指向的「組織架構指南」可能仍提舊架構）。
- **建議**：審一遍延伸閱讀的子頁，移除 WP 與 Discord 殘留。

### C4. 根 CLAUDE.md 的「修改守則」仍以 Discord Bot 為對象
- **位置**：根 `/Users/jay049/CLAUDE.md` 最末段
  ```
  - 修改 discord_bot.py 後也需要重啟
  - 重啟前先 pkill -f "python3 discord_bot.py" 再啟動
  ```
- **問題**：Discord Bot 已退役，此規則無對象。
- **建議**：刪除這兩行；如未來改 Telegram Bot 流程再補新規則。

### C5. 根 CLAUDE.md「照片處理流程」第 6 步「Discord 按鈕指認」與第 9 步「固定 logo 浮水印」
- **位置**：同上 10 步驟章節
- **問題**：Discord 按鈕指認流程不存在了（要走 Telegram）；浮水印根據 Notion 圖像指南已暫不實作（規劃 Cloudinary 動態浮水印）。兩條規則都是垃圾。
- **建議**：第 6 步改「Telegram 私訊指認（待實作，過渡期手動）」，第 9 步刪除或改「（暫不實作）」。

### C6. notion_structure.md 在 DB04 章節寫「庫存門市 = 值班顧店 / 場地租借 / 保養維護（不是用於庫存異動）」
- **位置**：`memory/notion_structure.md` 第 30 行附近
- **問題**：依 audit_docs_alignment 第 50 行，Notion 資料庫類別指南 DB04 交接類型有第三選項「共識互動」，本檔只列兩個。但若 Notion 實際 schema 仍只有「專案協作 / 庫存門市」（fetch 第五節大分類表確實只列兩個），這條描述是對的，問題在「資料庫類別指南」第四節寫成三個——以 Notion fetch 結果為準，本檔正確、指南錯。
- **建議**：把這條從「無用」轉為「指南要修」 — 修改資料庫類別指南第四節，刪除「共識互動」第三選項；本地 notion_structure.md 不動。

### C7. feedback_db06_mingxi_type.md 與 ticket_product_model.md 衝突（要重新評估，可能屬無用）
- **位置**：`feedback_db06_mingxi_type.md` 強制「DB06 明細類型一律 = 報名登記」；`ticket_product_model.md` 第 42 行寫「DB06 明細類型 = 庫存紀錄」。
- **問題**：兩條規則看起來矛盾。feedback 是 2026/04/23 四九 親口指示，理論上覆蓋舊 ticket_product_model；那麼 ticket_product_model 第 42 行的「明細類型 = 庫存紀錄」就是無用過時規則。
- **建議**：在 ticket_product_model.md 第 42 行改成「明細類型=報名登記（依 feedback_db06_mingxi_type 規則）」。

### C8. snippet_audit_plan.md 整份「待全站健檢」清單
- **位置**：`memory/snippet_audit_plan.md` 全檔
- **問題**：WP 已退役，全站 snippet 不會再健檢。整份待辦無對象。
- **建議**：刪除或標 ARCHIVED，從索引移除。

### C9. cultureclub_calendar_blocked.md「下次嘗試時用 Elementor 編輯器」
- **位置**：該檔最末「How to apply」
- **問題**：cultureclub.makesense.site 子站不會再用 Elementor 操作（已退役）。整份「下一步」屬死規則。
- **建議**：刪檔或標 ARCHIVED。

### C10. market_booking_progress.md 待處理清單第 1-9 項
- **位置**：該檔「待處理（下次 session）」整段
- **問題**：所有待辦都針對 WP + TEC + WooCommerce + n8n DB04→WP 同步。新站 makesense.ink 不走這條鏈，整段待辦皆無實作對象。
- **建議**：刪檔或縮成 1 行「歷史紀錄：market-booking 在 WP 時期最後狀態」。

### C11. 根 CLAUDE.md 第 9 步浮水印 + 「Pillow 畫質增強」
- **位置**：同 C5。Cloudinary AI 增強已取代 Pillow（圖像指南、photo_workflow_progress 都這樣寫）。第 7 步「Pillow 預設、Cloudinary ≥50 張才用」已不符合現況（n8n v4.1 一律走 Cloudinary）。
- **建議**：刪除「Pillow 畫質增強」描述。

---

## 優先處理 5 條（不分類）
1. **A1**：Notion 資料庫類別指南第五節 DB 編號錯位（DB06 沒獨立條目，07/08/09 全錯一格）— AI 直接讀錯。
2. **A2**：同指南第二節收入結構錨點寫成 DB06，應為 DB08。
3. **A3**：makesense-ink/app/api/sync/single/route.ts:205 把「對應發佈單位」改為「對應辦理單位」（events.related_partner_ids 一直缺值）。
4. **C1 + C2**：把 project_architecture.md 與 6 份 WP legacy md 移到 `memory/legacy/`，MEMORY.md 主索引清掉，避免新 session 把舊規格當現行。
5. **C5 + C11**：根 CLAUDE.md 的「照片處理流程 10 步驟」與「修改守則」整段重寫，刪 Discord 按鈕、Pillow、固定 logo 浮水印、`pkill discord_bot.py` 等已死規則；改寫成「目前實際走 n8n v4.1（見 Notion 圖像製作指南）」。
