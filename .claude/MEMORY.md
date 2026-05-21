# 專案記憶

## 使用者資訊
- 公司對外品牌：**makesense**（全名 sense makes sense，簡稱 sms）— 法人名「現思文化創藝有限公司」僅供正式文件
- 角色：L5 執行長/共同創辦人
- 子品牌：旅人書店、moku 等
- [brand_naming.md](brand_naming.md) — 命名鐵律：用 makesense/sms，不要用 xiansai

## 核心專案：makesense.ink + brand_monitor + Telegram Bot
- 官網：`/Users/jay049/Code/makesense-ink/`（Next.js + Vercel + Supabase）
- 品牌情報監測：`/Users/jay049/Documents/工作參考資料/brand_monitor/`（Python 3.9.6，通知層用 Telegram）
- 已刪：`photo_processor/`（2026/05/09 刪，Discord 指認版過時）；face_db 14M 備份在 `face_db_backup/`
- Bot 統一走 Telegram（Discord Bot 已退役）
- 四九 Telegram User ID: `8523155253`（私訊鎖定用）
- 詳細架構見 [project_architecture.md](project_architecture.md)
- [telegram_bot_setup.md](telegram_bot_setup.md) — Telegram Bot 設計方向、四九 ID、待確認事項
- [hihi_concierge_design.md](hihi_concierge_design.md) — 嗨嗨總管 Bot 完整設計（已決定 Plan B Mac 本地跑）
- [hihi_email_setup.md](hihi_email_setup.md) — hihi@makesense.ink 主機（Namecheap）、收信轉寄、SMTP 寄信、US$14.88/年

## Notion 系統架構
- 9 個 DB 構成 XYZ 三軸座標系統（DB01~DB09 連續編號）
- DB 短名（以 Notion 實際 title 為準）：資源提案/績效管考/項目進度/協作交接/登記內容/清單明細/庫存控管/關係對象/日期紀錄
- 詳見 [notion_structure.md](notion_structure.md)
- [notion_ai_agent_fields.md](notion_ai_agent_fields.md) — 9 個 DB 共用的 5 個 AI 代理欄位（分析備註/檢核備註/核銷備註/ai_對應對象/ai_對應標籤；2026/05/17 退役 12 個 per-agent 欄位後精簡至此；純 Notion 內部用，跟官網/Supabase 無關）

## 重要指南文件（Notion）
> Notion fetch 用純 ID 會偶爾解析錯（撈到 DB schema），統一用完整 URL（含 `/049/` workspace 前綴）。
- 系統總論指南：https://www.notion.so/049/2869ff25fdab80c6a266f1228f8bd587
- 資料庫類別指南：https://www.notion.so/049/3279ff25fdab80a18fffff56c578a86a
- 組織架構指南：https://www.notion.so/049/3289ff25fdab80fa90b8f5d408a366fa
- 文案撰寫指南：https://www.notion.so/049/3279ff25fdab80aaa42be8d6dd91daed
- 圖像製作指南：https://www.notion.so/049/3299ff25fdab8040bcaad28122bebff8
- 各類指南總頁：https://www.notion.so/049/2799ff25fdab80fea78ee261b4e792a2
- 官網維護指南：https://www.notion.so/049/32c9ff25fdab81389368eac6f77bc417
- 官網內容撰寫指南：https://www.notion.so/049/3329ff25fdab8017b9a3eae1fb7fb5a2

## API Keys（已設定在 config.py）
- Cloudflare R2（圖檔儲存，2026/04/29 從 Cloudinary 遷移過來，月費約 $5 vs Cloudinary $89）、Google Maps、Notion、Telegram Bot Token、Claude API
- ~~[cloudinary_setup.md]~~ **DEPRECATED**（Cloudinary 2026/04/29 停用，已遷至 R2，詳見 onedrive_photo_migration.md）

## 嗨嗨 n8n pipeline（自建,取代 Notion AI agent）
- [hihi_n8n_pipeline.md](hihi_n8n_pipeline.md) — v3 reviewer-in-the-loop 架構、4 個 workflow ID、每項皆「特殊工項」設計方向
- [db07_hihi_pipeline_rollout.md](db07_hihi_pipeline_rollout.md) — DB07 商品掛 6 工項產簡介摘要；240 筆批量改無關卡自動跑

## 嗨嗨家族
- **2026/05 重整**：執行架構改 n8n + Claude + Telegram reviewer-in-the-loop（見 [hihi_n8n_pipeline.md](hihi_n8n_pipeline.md)）。**嗨嗨構想已退役、併入嗨嗨企劃**（企劃變 stage-aware 規劃師）。家族從 7 → **6 成員**：企劃／搜查／分析／聯想／文案／檢核 ＋ 元層總管。
- 執行順序由 DB06「排序」決定，非固定鏈；「企劃→搜查→分析→聯想→文案→檢核」只是建議預設順序。
- 嗨嗨聯想核心能力：**跨類資料引用**；特殊權限：**家族中唯一可寫名稱含「引用」的欄位**（「被引」由 Notion dual-sync 自動鏡射、無人手動寫；2026/05/17 四九 明示）
- 嗨嗨搜查 2 模式（2026/05/18 重整→2）：專題研究（別人 URL→抓網頁內容+合法檔案）/ 數據紀錄（自家 URL→抓數字指標）。界線＝對應連結是不是自家的
- 嗨嗨搜查特殊權限：可新建 DB08 page；**也可新建 DB01 page** — 採集到值得推薦的提案時把提案名稱新建進 DB01（2026/05/17 四九 明示）
- [hihi_scout_toolkit.md](hihi_scout_toolkit.md) — 嗨嗨搜查工具箱 scout_lib.py（Playwright/cookie/R2/批次續跑），位於 hihi_scout/
- [dedao_knowledge_archive.md](dedao_knowledge_archive.md) — 劉潤兩門 5分鐘商學院 681 篇全文已封存進 DB06
- 嗨嗨企劃核心能力（規劃師,含原嗨嗨構想職責）：把任何 target 輪廓變可執行架構;stage-aware 每次登場先盤點素材推進規劃;內容類產出章節架構/活動流程/空間場域/視覺版面,提案類產出提案大綱,採購類產出建檔規劃
- 嗨嗨文案核心能力：依文案選項自動套對應子類指南（地方通訊/網頁社群/新聞稿/提案/報告/腳本/簡報/訪查/行政）+ 四九 voice profile；特殊權限：**家族中唯一可動 target page 的 page content**（2026/05/17 四九 明示，與既有「文案寫簡介摘要+page content」一致）
- 嗨嗨分析核心能力：外部檔案分析 + 內部資訊分析（從 page content 抽具名詞彙建 DB08 紀錄）。家族「認識/鑑定」棒 —— 輸入端獨佔：**唯一可處理照片/外部檔案（多模態）**；輸出端獨佔：**唯一可寫分析備註**（每張 page 的身份 metadata）
- 嗨嗨檢核核心能力：各項產出完整性檢查 + 文案語意對應檢查；特殊權限：**家族中唯一可寫「檢核備註」欄位**。輸出 4 處：target 的 執行備註+檢核備註、DB06 觸發 page 的 執行備註+檢核備註；**不再寫 分析備註**（分析備註為嗨嗨分析專屬，2026/05/17 四九 明示）；chain 末端、不修其他欄位
- 嗨嗨總管元職責：突發任務派工 / 家族協調仲裁 / 主動巡邏與洞察
- [hihi_4-2-x_migration.md](hihi_4-2-x_migration.md) — 家族工作指示遷移到各類指南 4-2-X 子頁；4-2-1 總管已完成、4-2-2~4-2-7 空頁已建；skill .md 剝薄成載入器
- [hihi_archive_extraction.md](hihi_archive_extraction.md) — 封存萃取＝總管工作模式（不新增第 7 成員），triage + merge-write 累積教訓庫養文案
- [db_dedup_merge_capability.md](db_dedup_merge_capability.md) — DB01-09 重複偵測與合併＝總管常駐能力，兩層架構，DB08 清理是第一次實跑
- [hihicheck_quality_design.md](hihicheck_quality_design.md) — 檢核品管 4 欄位（字數目標 + 退回次數/過期/每千字退回次數 formula）；KPI＝每千字退回次數↓；檢核當「失敗記錄器」不打分

### 嗨嗨家族架構（2026/05/14 重整）
- **共通規則住「工作導覽地圖」**：[4-1-1 嗨嗨家族工作導覽地圖 §共通鍵規區](https://www.notion.so/049/3459ff25fdab81aeab9ff3c8281805e5) 含 5 個共通段落（欄位字典導引 / 分析備註範本規範 / 欄位組合規則合集 / DB08 建檔分工鐵律 / 動手前 checklist）
- **欄位字典 §1.D**：[2-2-1 欄位名稱指南](https://www.notion.so/049/32b9ff25fdab81caadd5e016cced1efe) 是 分析備註範本格式的 single source of truth。**統一 3-token 範本**（9 個 DB 都一樣）：`[類型]｜[執行時間]｜[關聯 DB]`。[類型] 依 [2-2-2 欄位組合指南](https://www.notion.so/049/35e9ff25fdab80269dc4f65a7ce83305) 位階組合 AI 自拼，不依 formula 值。
- **分析備註／檢核備註 權限（2026/05/17）**：`ai備註` 欄位 9 DB 全部改名為 `分析備註`，**唯一由嗨嗨分析寫**；分析備註為空 = 該 page 尚未被分析鑑定過。`檢核備註` **唯一由嗨嗨檢核寫**。`核銷備註`（text，DB01-09 共用，核銷紀錄用，2026/05/17 新增）。其他棒要留訊息一律寫自己的 `執行備註`。
- 各 skill 不再重複共通規則，改成連結到工作導覽地圖（2026/05/14 全家族精簡：825 → 658 行）
- 嗨嗨分析四種工作模式：文字分析 / 照片視覺 / 素材篩選 / 實體建檔（不再用 A/B/C/D 字母）
- 嗨嗨分析建 DB08 不分類人物/品牌/地點，一律「經營類型=紀錄」
- 分析備註二段式（DB08 新建 page）：上下文 + 判斷依據（不寫「類別」）
- 9 個 DB 各有 formula「跨類摘要」= 分析備註「[資料身份]」cell 取值來源（分析備註空 → 跨類摘要空 = 誠實反映「未鑑定」）
- **欄位改名**：（2026/05/14）DB01-04、DB06-09 的 `ai_meta` → `ai備註`；DB05 的 `ai辨識分析` → `ai備註`；DB05 原有 `ai_meta` 四九 自行刪除。（2026/05/17）9 DB 的 `ai備註` 全部再改名為 `分析備註`
- 執行時間三粒度：一般 YYYY/MM/DD、月刊 YYYY/MM、季刊 YYYY/Q1
- 「無執行」狀態：可跑、跑完設完成、**不觸發下一項**
- 發現 DB08 既有重複 page：嗨嗨分析在 分析備註 標記、不自己處理、留給 nvc

## 注意事項
- dlib 無法在此 Mac 編譯，人臉辨識改用 insightface + ONNX（face_api.py，本地 port 5050）
- 照片 < 20 張不做去重
- Notion DB05「登記內容」是原子資料層，最常用
- DB05 連結 DB08 用「對應對象」（DB06 連 DB08 用「對應標籤對象」）
- DB05 大分類欄位：「內容類型」（DB06 大分類叫「明細類型」）
- DB05 素材類別（select：圖像 / 文案 / 影音）

## Notion DB schema（現況）
### DB08 關係對象
- 經營類型 select：觀點 / 標籤 / 紀錄
  - 觀點 = 官網觀點漫遊/脈絡觀點（最能代表的觀點）
  - 標籤 = 一般 hashtag，可有頁面但非主打
  - 紀錄 = 不顯示於官網（供應商/採購單位等後台資料）
- 關係選項 select：個人 / 合作夥伴 / 工作團隊
- 行政區域（select）
- persons/partners/staff 篩選邏輯：會員狀態=會員 AND 關係選項=X
- topics tag_type 映射：觀點→viewpoint、標籤→tag、紀錄→不同步
- 自對標籤（relation → DB08 自身）
- 簡介摘要（rich_text，嗨嗨文案寫）/ 同義備註（rich_text，別名**換行分隔**，嗨嗨分析查重時必比對）
- 新建流程：**只有嗨嗨搜查、嗨嗨分析**可新建 DB08 page（其他棒不可，發現缺就在自己的 執行備註 標記留給這兩棒）。抽到具名詞彙 → 比對 DB08 對象名稱+同義備註 → 未見過則新建（**經營類型=紀錄**，後台桶不顯示官網）→ 嗨嗨文案後續寫簡介摘要。嗨嗨分析**不分類**（人物/品牌/地點/概念），分類由 四九 或文案後續判斷

### DB07 庫存控管
- 商品選項 select：選書 / 選物 / 數位（票券放在 數位 → 數位細項=票券）
- 細項欄位：選書細項 / 選物細項 / 數位細項
- 庫存類型 select（與商品選項正交）：商品 / 耗材 / 設備
- 耗材選項：工作辦公 / 包裝零件 / 獎禮贈品
- 頁面狀態（status，控制官網是否獨立頁面）：有頁面 / 無頁面 / 無狀態
- 商品ID = ISBN/EAN/自編條碼（同步進 Supabase products.sku 與 products.barcode）
- ai_對應作者 / ai_對應標籤 / ai_對應發行 relation

### DB04 協作交接
- title：**協作名稱**
- 對應辦理單位（relation → DB08，承辦廠商）
- **協作類別**（select：辦理活動 / 製作內容）
- **活動選項**（select 6 項：陳列展售 / 文化冊展 / 講座課程 / 園遊市集 / **導覽走讀** / 會議展演）→ events.event_type / theme
- **實際總價**（formula）→ events.price
- **數量上限 / 最低數量**（number）→ events.capacity / min_capacity
- **簡介摘要**（rich_text）→ events.description
- **發佈狀態**（status：待發佈/已發佈/不發佈）→ events.status
- **門市類別**（select：盤點檢查/**使用場地**/保養維護/值班顧店）
- **交接回覆**（text）
- 執行時間（date）：有 end date 時計算 duration_min（分鐘差值），無 end date 預設 120 分鐘
- **距離km**（number，**無括號**）→ events.distance_km → point_ledger type=距離行程
- **對應內容**（relation → DB05）

### DB05 登記內容
- 內容類型 select：報名登記 / 共識互動 / **內容素材**（DB06 明細類型叫「圖文影音」，兩者不同）
- **登記類別** select：紀錄費用 / 紀錄庫存 / **填寫報名**
- **報名選項** select：活動 / 空間 / 意見（搭配 登記類別=填寫報名）
- **互動類別** select：內部共識 / 外部聯繫
- **素材類別** select：圖像 / 文案 / 影音
- **點交備項** select
- **文書細項** select
- 庫存選項 select：進貨 / 出貨 / 盤點
- 庫存異動規則：內容類型=報名登記 + 登記類別=紀錄庫存 + 庫存選項=進貨/出貨/盤點 → DB06（明細類型=庫存紀錄）→ DB07
- lib/staff-helper.ts attendance 用「紀錄細項」select（options：會議/打卡/請假/日誌/加班）

### DB05 三層 relation 設計
- **對應X**（9 個）= 直接上下游 → 聚合查詢用（可手動寫）
- **X引用**（9 個）= 引用提及，出向 → 不參與聚合、不同步 Supabase（可手動寫）
  - 提案引用 / 管考引用 / 項目引用 / 協作引用 / 內容引用 / 明細引用 / 庫存引用 / 對象引用 / 日期引用
- **X被引**（9 個）= 此 page 被他人引用，入向 → 不參與聚合、不同步 Supabase；**是 X引用 的 dual-sync 反向（Notion 自動鏡射），AI 不需操作。已驗證 9 對全部都是 dual-sync**
  - 提案被引 / 管考被引 / 項目被引 / 協作被引 / 內容被引 / 明細被引 / 庫存被引 / 對象被引 / 日期被引
- 完整說明見 [notion_structure.md](notion_structure.md)「對應 / 引用 / 被引」段

## 系統一致性稽核（2026-04-28 ~ 05-05 多輪）
**最終 latest 報告（已超越舊版）：**
- [audit_pairing_failures_2026-04-29_v3.md](audit_pairing_failures_2026-04-29_v3.md) — 程式↔Supabase↔Notion 配對（v3 最終）
- [audit_docs_alignment_2026-04-29_v3.md](audit_docs_alignment_2026-04-29_v3.md) — 文件對齊（v3，含 custom skill）
- [audit_db_schema_2026-04-28.md](audit_db_schema_2026-04-28.md) — DB schema 深度
- [audit_ai_agent_fields_2026-04-28.md](audit_ai_agent_fields_2026-04-28.md) — 14 AI 欄位

**指南頁稽核（2026-04-29）：**
- [audit_notion_guides_p1_2026-04-29.md](audit_notion_guides_p1_2026-04-29.md) — 系統總論+資料庫類別
- [audit_notion_guides_p2_2026-04-29.md](audit_notion_guides_p2_2026-04-29.md) — 文案+圖像+組織
- [audit_notion_guides_p3_2026-04-29.md](audit_notion_guides_p3_2026-04-29.md) — 各類總頁+官網2份

**子分頁稽核（2026-05-05）：**
- [audit_notion_subpages_a/b/c/d/e_2026-05-05.md] 5 份
- [audit_notion_external_contact_2026-05-05.md] 外部聯繫
- [audit_root_md_2026-05-05.md] makesense-ink 根目錄 .md
- [audit_zombie_select_values_2026-05-05.md] 殭屍 select（0 筆 = 乾淨）
- [audit_page_templates_2026-05-05.md] page templates（受 API 限制）
- [cleanup_subbrands_2026-05-05.md] 子品牌敘述清理

> 舊版 audit + WP-era project files 已移到 `legacy/` 子目錄（保留歷史不刪）

## 品牌提案情報監測系統（brand_monitor）
- 本地路徑：`~/Documents/工作參考資料/brand_monitor/`（Python 3.9.6 venv，通知層用 Telegram）

## makesense.ink 新官網（Next.js 16 + Vercel + Supabase）**現行主力專案**
- 本地路徑：`/Users/jay049/Code/makesense-ink/`
- [makesense_ink_tech.md](makesense_ink_tech.md) — 技術棧、頁面結構、Supabase 表、三種入口/角色、開發狀態
- [makesense_ink_vision.md](makesense_ink_vision.md) — 一站三角色、LINE 角色互動、圖書館級內容量、商業化願景
- [makesense_ink_supabase_migration_done.md](makesense_ink_supabase_migration_done.md) — 2026/04/13 全站 Supabase 遷移完成 + 即時同步機制
- [ticket_product_model.md](ticket_product_model.md) — 票券放 DB07 作通用商品，跨活動共用
- **官網同步區**：Notion 頁面 `3419ff25fdab80f59b03fcafbd9c7bb8`，每個 DB view 對應官網一個元素
- [line_integration_handoff.md](line_integration_handoff.md) — LINE 整合交接文件（待驗證項目清單）
- [page_structure_footer_pages.md](page_structure_footer_pages.md) — Footer 四頁面上下半部架構（DB05 官網備項 + Supabase 動態資料）

## 使用者偏好
- ⭐ [feedback_no_shortcuts.md](feedback_no_shortcuts.md) — **Claude 預設偷懶傾向、四九 設計關卡神聖、不准繞**（critical priority、列 9 種偷懶手法供 四九 揪）
- [user_tech_level.md](user_tech_level.md) — 非工程師，技術說明需白話
- [feedback_full_code.md](feedback_full_code.md) — 程式碼永遠給完整內容，不要片段
- [feedback_no_manual_edit.md](feedback_no_manual_edit.md) — 永遠不要叫用戶手動改 snippet，生成匯入檔讓他匯入
- [feedback_no_rest_suggestion.md](feedback_no_rest_suggestion.md) — 不要叫用戶去休息，他會自己決定什麼時候停
- [feedback_be_accurate.md](feedback_be_accurate.md) — 講話要確實，不確定就說不確定，不要說完成了結果壞掉
- [feedback_db06_mingxi_type.md](feedback_db06_mingxi_type.md) — 訂單寫入 DB06 時「明細類型」一律「報名登記」
- [feedback_frame_work_for_user.md](feedback_frame_work_for_user.md) — 描述工作量時用對使用者的影響來框架，技術難度是我的事
- [feedback_auto_merge_pr.md](feedback_auto_merge_pr.md) — makesense-ink 專案授權自動 merge PR + 部署，不需逐次確認
- [feedback_vercel_envar_no_trailing_newline.md](feedback_vercel_envar_no_trailing_newline.md) — 設 Vercel envar 用 echo -n + pipe 避免 \n 結尾造成 401
- [feedback_thorough_analysis.md](feedback_thorough_analysis.md) — 稽核結果不得說「快速分析」，要徹底不要快速
- [feedback_corresponding_tag_open.md](feedback_corresponding_tag_open.md) — 對應標籤家族都可寫；但新建 DB08 page 只有嗨嗨搜查、嗨嗨分析可以
- [feedback_db07_no_commerce_restriction.md](feedback_db07_no_commerce_restriction.md) — 對應庫存(→DB07)不限商品交易，內容提及 DB07 entity 即可連
- [feedback_hihi_field_ownership.md](feedback_hihi_field_ownership.md) — 嗨嗨管考寫「執行備註」、嗨嗨文案寫「簡介摘要」+ page content
- [feedback_pipeline_gating.md](feedback_pipeline_gating.md) — 嗨嗨家族 pipeline 工項間需總管/管考 verify 才放行下一項，不可自動連鎖
- [feedback_difang_tongxun_wordcount.md](feedback_difang_tongxun_wordcount.md) — 地方通訊月刊 600-900/季刊 900-1500/年刊 1000-4000 字；禁氛圍詞，要具名事件+日期+人物+數字
- [feedback_no_punt_to_next_baton.md](feedback_no_punt_to_next_baton.md) — 跑某項工作時意外發現的本職資料要當場補，不可推給下一項
- [feedback_no_simplified_chinese.md](feedback_no_simplified_chinese.md) — 不喜歡簡體中文，採集入 Notion 一律 opencc s2tw 轉繁體
- [feedback_no_chat_report.md](feedback_no_chat_report.md) — 結果寫進 Notion/檔案後，對話不要再貼摘要報告
- [feedback_no_skip_no_hallucinate.md](feedback_no_skip_no_hallucinate.md) — 嗨嗨家族執行三鐵律：載 skill 先 fetch 全規範列 checklist；遇模糊必停下問；不准自決簡化跳過
- [feedback_n8n_url.md](feedback_n8n_url.md) — 提到 n8n workflow 一律直接給完整 URL（makesense.zeabur.app/workflow/ID），不要只給 ID
- [feedback_n8n_sdk_update_drops_credentials.md](feedback_n8n_sdk_update_drops_credentials.md) — n8n SDK `update_workflow` 會重生節點 ID、掉憑證（Notion/Telegram/Anthropic）。**本機 session**：小改動走外科 REST PUT 或 n8n 介面，保住節點 ID 與憑證。**雲端 session**：sandbox 網路政策擋掉 makesense.zeabur.app（`host_not_allowed`），外科 PUT 跑不了 → **直接用 MCP `update_workflow` 寫，不用再權衡憑證、也不用把「請四九本機貼 curl PUT」當預設來回問**；寫完提醒四九若該 workflow 有 credential 節點就去 n8n UI 重接一次（四九 2026/05 明示樂意重接）。註：嗨嗨家族那批 workflow 本來就 HTTP+env token、無 credential 節點，根本沒憑證可掉。

## 2015 地方通訊 pipeline 接力
- [dt_2015_pipeline_status.md](dt_2015_pipeline_status.md) — 17 頁管考工項第二輪完成（管考備註/分析備註/內容名稱/執行備註），DB08 對應 + 後 4 項待下一 session

## 【待開發】參考資料 PDF 批次轉 Notion
- 規模：上萬個 PDF（歷年工作累積的研究報告）
- 類型：大部分是文字型 PDF（數位排版研究報告），不是掃描
- 目標：PDF → markdown → 存入 Notion 當參考資料
- 建議方案：本地 Python（pdfplumber/PyPDF2）免費抽取文字，不需要外部圖像服務或 OCR
- 優先順序：照片遷移完成後再開始

## 照片自動處理 workflow
- n8n workflow ID: `inlFur0DvUx9Lyfg`；人臉辨識 face_api.py port 5050（insightface + ONNX）；Cloudflare R2 上傳；Telegram 通知 四九 TG ID `8523155253`
- [onedrive_photo_migration.md](onedrive_photo_migration.md) — 17萬張 OneDrive 照片大遷移計畫

## 【待開發】政府招標決標每日監測
- [pcc_tender_monitor_plan.md](pcc_tender_monitor_plan.md) — 每日 6:30 掃政府電子採購網招標/決標、比對 DB08 既有單位；P0 卡關＝DB08「單位選項」待四九 backfill

## 【待開發】審核通知系統
- 通知方式：LINE 官方帳號（優先）
- 每位用戶在會員介面可選擇通知方式（可複選）：Email、LINE
- 預設：兩者都通知
- 用戶可在會員介面自行關閉任一通知方式
- 觸發時機：Notion DB05「錄取結果」欄位變更（錄取 / 無錄取）時自動發送
- 尚未實作，先記錄需求
