---
name: OneDrive 照片大遷移計畫
description: 17萬張照片從 OneDrive → Cloudflare R2 + Notion 的完整處理計畫、DB04配對策略、四層對應
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---

> ⚠️ 本檔提及的 `photo_processor/` 目錄已於 2026/05/09 刪除，路徑僅供歷史參考；新流程走 n8n + face_api。

## 規模（2026/04/14 掃描結果）
- 總照片：169,910 張
- 資料夾：6,107 個（有照片的）
- 來源：OneDrive `/Users/jay049/Library/CloudStorage/OneDrive-共用文件庫－旅人書店`
- 硬碟可用空間：23GB（無法全量下載，需用 OneDrive API 或逐批處理）

## 過濾策略
| 優先度 | 條件 | 資料夾 | 照片數 |
|--------|------|--------|--------|
| **P1 最優先** | 純照片資料夾 + 日期命名（yyyy-mm-dd 主題） | 1,205 個 | 56,163 張 |
| P2 次優先 | 純照片資料夾 + 沒日期命名 | 1,721 個 | 86,063 張 |
| P3 不處理 | 混合資料夾（照片+文件，幾乎都是截圖） | — | 27,684 張 |

- 判斷規則：資料夾裡 90%+ 是照片 = 純照片資料夾
- 混合資料夾裡的照片通常是截圖，不處理

## 四層對應（優先順序）
1. **地點** → EXIF GPS → DB08 空間地點（完全自動，~70% 照片有 GPS）
2. **對象** → 人臉辨識 → DB08 經營類型=紀錄（自動辨識 + Telegram/網頁指認；舊 Discord 已退役）
3. **活動類型** → DB04「活動選項」「協作類別」欄位（半自動）
4. **單一活動** → 資料夾日期+名稱 → DB04「執行時間」+「協作名稱」（半自動）

## DB04 配對策略（2026/04/14 確認）
- **主要靠日期**：資料夾的 yyyy-mm-dd vs DB04「執行時間」（date:執行時間:start）
- **輔助靠名稱**：資料夾主題名稱 vs DB04「協作名稱」或「主題名稱」
- 日期完全匹配 + 名稱部分匹配 = 幾乎 100% 準確
- DB04 欄位結構已確認：協作名稱、主題名稱、date:執行時間:start、活動類型、協作類別

## 處理流程
1. 掃描資料夾 → 過濾出 P1（純照片+日期命名）
2. 讀 EXIF（GPS + 拍攝時間）— 需要先下載照片或用 OneDrive API
3. GPS 座標聚類（相近座標歸同一地點）→ Google Maps Geocoding → DB08 地點
4. 比對資料夾日期 → DB04 執行時間 → 配對活動
5. 上傳 Cloudflare R2（資料夾結構對齊 DB02/03/04）
6. 人臉偵測 + 自動辨識
7. 寫入 DB05（含所有 relation）
8. 在資料夾放 `.processed` 標記檔（JSON，記錄處理資訊）

## 處理標記（.processed）
處理完的資料夾放隱藏檔，不改檔名不改位置：
```json
{
  "processed_at": "2026-04-14T18:30:00",
  "photos": 189,
  "cloudinary_folder": "makesense/...",
  "db04_page_id": "xxx"
}
```

## 費用
- Cloudinary Plus：$89/月（300GB 儲存）
- Google Maps Geocoding：~$50~100（幾百個不同地點）
- 人臉辨識：免費（insightface 本地）
- 使用者已同意付費

## 照片分布統計
- 檔名含截圖/screenshot：3,953 張 → 過濾
- PNG 檔案：8,266 張 → 需判斷
- LINE 照片：10,300 張 → 畫質差但有內容
- IMG_（手機照片）：41,912 張 → 高價值
- DSC/DSCF（相機照片）：21,950 張 → 最高價值

## 存取方式（2026/04/14 確認）
- 不用 Graph API，直接用 OneDrive 檔案系統（隨選下載）
- OneDrive app 要先登入，否則檔案讀取會 timeout
- OneDrive Mac app 常自動關閉，開跑前先確認 app 有在執行

## Pipeline 腳本
- 檔案：`photo_processor/photo_migration.py`
- 用法：`python3 photo_migration.py --folder "path" | --scan-p1 | --batch-p1 [--dry-run] [--limit N]`
- 流程：EXIF 讀取 → GPS 配對 DB08（緯度/經度 number 欄位）→ Cloudflare R2 上傳 → DB05 寫入
- DB05 欄位：內容名稱(title)、內容類型=內容素材、素材類別=圖像、圖像備項=照片、對應地點(relation→DB08)、對應協作(relation→DB04)、上傳檔案(external URL)、明細內容(rich_text)
- DB08 GPS 欄位：「緯度」「經度」(number)，另有「地點」(place) 給 Notion 地圖視圖用
- GPS 配對門檻：1 公里內
- 處理完的資料夾放 `.processed` JSON 標記檔

## 試跑結果（2026/04/14）
- 資料夾：2024-07-24 校長宿舍防颱維護（14 張照片）
- Cloudinary 上傳：14/14 成功
- DB05 寫入：14/14 成功
- GPS → DB08 配對：6/14（有 GPS 的全部成功，距離 3~12 公尺）
- 無 GPS 的 8 張照片沒有標地點（正確行為）

## 進度
- [x] 掃描 OneDrive 照片數量（169,910 張）
- [x] 分析資料夾結構（純照片 vs 混合）
- [x] 確定過濾策略（P1→P2→P3）
- [x] 確定 DB04 配對策略（日期+名稱）
- [x] 確認 DB04 欄位結構
- [x] 存取方式確認（OneDrive 檔案系統直接讀取）
- [x] 試跑 1 個資料夾（14 張，全部成功）
- [x] P1 部分處理（2,063 / 2,394 資料夾，已上傳 55,386 張到 Cloudinary）
- [ ] **【中斷】2026/04/27** Cloudinary 通知 4/29 停用（用量 705%，每月 $100 不付）
- [ ] DB08 批次填入更多地點的 GPS 座標
- [ ] **改用 Cloudflare R2** 重做（R2 容量約 $3/月，遠便宜過 Cloudinary $89/月）
- [ ] P2 處理（1,721 個資料夾，86,063 張）

## 🔴 2026/04/27-29 重置完成
- 決策：放棄 Cloudinary（每月 $89 太貴），改用 Cloudflare R2（每月約 $5）
- **OneDrive .processed 標記**: 2,063 個全部清除 ✅
- **Notion DB05 migration 記錄**: 55,386 筆全部 archive ✅（清除腳本：`cleanup_db05_migration.py`）
- **Cloudinary**: 4/29 自動停用，照片自動消失

## 🟢 2026/05/03 v3 pipeline 重做（Microsoft Graph API + Cloudflare R2）

### 為什麼換架構
- v1/v2：用 OneDrive Mac app 隨選下載 → 常 timeout、要本地硬碟空間
- v3：Microsoft Graph API 直接串流到 R2，**完全不碰本地硬碟**

### Microsoft Graph API 設定（Azure AD app）
- Tenant: 旅人書店 `0ae1b2ed-cd2f-4ed2-aa53-1c430a64b0b5`
- App: Photo Pipeline `6da1e645-eeac-490d-bb17-c40938263df7`
- Permissions: Files.Read.All + Sites.Read.All（已 admin consent）
- Client secret 到期 2028/5/2，存在 config.py
- 27 個 SharePoint sites（moku羅東、Jay & Vanessa、宜蘭專案計畫…）

### Cloudflare R2 設定
- Bucket: `makesense-photos`（亞太區）
- 公開 URL: `https://pub-23c93c89519e48958e84298739337568.r2.dev`
- API token 名: photo-pipeline（Object Read & Write）
- 月費約 $5（170K 照片預估 ~510GB）

### 用的不是 Cloudflare Images，是 Cloudflare R2（重要區別！）
- R2 = 通用物件儲存，沒有 variants、沒有自動最佳化
- 一個 URL = 一個原檔
- 如果以後要浮水印 / 多 variant，要另外處理（Worker / 升級 Images / 預先生成）

### URL 格式
```
https://pub-23c93c89519e48958e84298739337568.r2.dev/photos/{sha[:2]}/{sha[2:4]}/{full_sha256}.{ext}
```
範例：`.../photos/9c/81/9c812bcbf6d9...c1172c.jpg`

### Pipeline 腳本：`photo_processor/photo_pipeline_v3.py`
用法：
- `--list-sites` — 列所有 SharePoint sites
- `--scan SITE` — 統計某 site 照片數
- `--test SITE PATH` — 試跑前 N 張
- `--process SITE PATH` — 處理整個資料夾
- `--process-site SITE` — 處理整個 site
- `--process-all` — 處理全部 sites（背景跑用這個）

### 進度檔（本地不放 OneDrive）
- `photo_processor/processed_v3.json` — 用 graph item_id 當 key，記 status / sha / db05_id
- `photo_processor/sha_cache_v3.json` — sha → db05_page_id 快取，加速去重

### DB05 寫入規格（階段 0：目前實作）
僅自動填這幾個欄位：
- 內容名稱 (title): 資料夾名_檔名
- 內容類型: **內容素材**（select；2026/05/07「內容素材」改名為「內容素材」）
- 素材類別: 圖像 (select)
- 圖像備項: 照片
- 上傳檔案 (external URL): R2 公開連結
- 執行時間 (date): EXIF 拍攝時間 +08:00
- **執行備註 (rich_text): 純文字所有 metadata**（最重要，給 Notion AI 反查用）

執行備註格式範例：
```
[狀態] 待自動連結
[拍攝] 2024:07:24 10:29:34
[Site] moku羅東
[資料夾] General/2024-07-24 校長宿舍防颱維護
[GPS] 24.671811, 121.770156
[活動關鍵字] 校長宿舍防颱維護
[人物] （待人臉辨識）
[相機] Apple iPhone 14 Pro
[來源] 自有
[授權] 自有
[檔名] IMG_6297.JPG
[SHA256] 9c812bcbf6d9478d...
[R2] photos/9c/81/9c812bcbf6...jpg
```

### 階段 1（尚未實作）將自動填這些 relation
- `對應地點` → DB08（用 GPS 距離 < 1km 配對）
- `對應協作` → DB04（用資料夾日期+名稱配對）
- `對象引用` → DB08 人物（用人臉辨識，需階段 2；用 X引用 系列不污染聚合 VIEW）
- 透過 DB04 接力連到 DB02 計畫 / DB03 項目（自動繼承）

### R2 物件本身沒寫 metadata
- 所有 metadata 在 Notion 的 執行備註 + relation 欄位
- 反查照片靠：(a) Notion AI 讀文字摘要 (b) DB05 relation 反向查
- 若文案 Agent 找不到照片，標記「需人工提供」，不要亂找

### 階段 0 進度（2026/05/10 更新）
- v3 pipeline 已啟動 process-all
- 2026/05/09 21:36 啟動單線程版 → 2026/05/10 09:25 改 10 workers parallel 重啟
- 已處理 27,221 張（多數是 dup 快速 skip，新 ok 約 423 張）
- 失敗主要是 Notion 暫時 502/504（不是程式錯）
- 跑完後寫 retry 腳本補 db05_failed 的

### 2026/05/10 待做：photo_processor 搬離 Documents
- 路徑：`~/Documents/工作參考資料/photo_processor` → `~/Code/photo_processor`
- 原因：launchd 跑的程式被 macOS TCC 沙盒擋（Documents 受保護）
- 搬完 launchd plist 自動拉 v3 / face / streamlit（plist 已寫好在 `~/Library/LaunchAgents/com.makesense.*.plist`，wrapper 在 `~/.local/bin/run_*.sh`）
- 觸發時機：v3 全量跑完（~1.5 天後）+ 確認沒手動跑著的 script
- 搬完要做：
  1. mv photo_processor → ~/Code/
  2. sed 改 wrapper 跟 plist 裡 3 個路徑
  3. `launchctl load` 三個 plist
  4. 確認 PID 在跑

### 2026/05/10 人臉辨識互動規則（四九 睡前定）
1. **辨識的對象若 DB08 有 → 直接把 DB05 page 關聯到該 DB08 對象**（已實作於 sync_worker，寫「對象引用」relation）
2. **未辨識照片若有類似已指認對象 → 系統問是否同一人**
   - 抽到的新臉沒被 HDBSCAN 分進已命名群時，跟所有已命名 cluster 代表臉算 cosine 距離
   - 距離 < 0.5（接近但不自動同群）的 → 列出供 四九 確認
   - UI：admin_local 第三分頁「🤔 待確認同一人」
   - 確認後 → 設 cluster_id；拒絕 → 標 reject 下次不問

### 2026/05/10 階段 2 人臉辨識基礎建設
- Supabase 表：
  - `face_clusters`（id uuid PK / label / db08_page_id / sample_face_id / member_count / reviewed）
  - `face_embeddings`（id uuid PK / page_id / face_idx / bbox jsonb / embedding vector(512) / cluster_id / cluster_distance / pose_yaw / blur_score）
  - 啟用 `vector` extension，ivfflat cosine 索引
- SQL function：`face_find_similar(embedding, limit, max_distance)` / `face_list_for_page(page_id)` / `face_recount_clusters()`
- Python 工具（**用 venv_phase2** 跑，避開系統 Python 環境地獄）：
  - `photo_face_extractor.py` — insightface buffalo_l 抽 ArcFace 512 維 → 寫 face_embeddings
  - `photo_face_clusterer.py` — HDBSCAN 分群 → 寫 cluster_id
- venv 建立：
  ```
  cd photo_processor
  python3 -m venv venv_phase2
  ./venv_phase2/bin/pip install insightface onnxruntime hdbscan numpy pillow pillow-heif requests
  ./venv_phase2/bin/python photo_face_extractor.py --limit 10
  ```
- 模型自動下載到 `~/.insightface/models/buffalo_l/` 約 280MB（首次跑）
- makesense.ink admin UI：
  - `app/[locale]/admin/people/page.tsx` — 列群組、命名
  - `app/[locale]/admin/people/[id]/page.tsx` — 看群組所有成員
  - `api/admin/people/clusters/route.ts` — GET 列群組
  - `api/admin/people/cluster/[id]/route.ts` — PATCH 命名 / GET 看成員
- sync_worker：`photo_face_sync_worker.py` 把 cluster.db08_page_id 寫回 DB05「對象引用」（**不是「對應對象」** — 人臉辨識是引用提及，非直接上下游，避免污染 partner_metrics_v 等聚合 VIEW）
- 待做：拆群合群 UI、後台搜尋現有 DB08 person 綁定（避免重名 create 問題）

### 2026/05/10 階段 1.5 Supabase photo_phash 地基
- Supabase 表 `public.photo_phash`（page_id PK / phash bigint / sha256 / width-height-pixels / r2_key / r2_url / taken_at / site_name / folder_rel / group_id / is_representative / review_action / created_at）
- SQL function `phash_hamming(a bigint, b bigint) returns int`（用 PG17 bit_count）
- RLS enabled，只 service_role 能存取
- 兩條工具：
  - `photo_phash_backfill.py`（獨立腳本，撈 DB05 → 算 phash → 寫 Supabase；workers=2 預設）
  - `photo_pipeline_v3.py` 新版 patch（DB05 寫成功後順手算 phash 寫 Supabase；尚未重啟 deploy）
- config.py 加 SUPABASE_URL / SUPABASE_SERVICE_KEY
- 待做：SQL 分群 query、makesense.ink/admin/duplicates UI

### 2026/05/10 parallel 化升級
- 改 ThreadPoolExecutor + thread-safe locks（_progress_lock / _sha_lock / _token_lock / _inflight_lock）
- inflight_sha dict + Event 防同 sha 競爭建重複 DB05
- 新增 `--workers N` 參數（預設 5，實跑 10）
- 預期速度從 7 秒/張 → ~1 秒/張，全量從 23 天 → ~3 天
- ⚠️ 系統 python3 site-packages 容易被其他 pip install 拆掉（imagehash 升級 numpy 時把 exifread/boto3/msal 帶走過一次），未來考慮搬到 venv

## 新版照片系統設計（2026/04/29 確定方向）

### 4 個核心需求
1. 人臉辨識（Google Photos / iOS 相簿等級的自動分群）
2. GPS 標示
3. 同一張照片多處引用，不重複儲存
4. 客戶有專屬資料夾，自動收集客戶上傳的照片

### 技術堆疊
- **儲存**：Cloudflare R2（~$5/月）
- **資料庫**：Notion DB05（照片）+ DB08（人物/地點/客戶）+ Supabase（向量搜尋）
- **去重**：SHA256（L1 完全相同）+ pHash（L2 視覺相似）
- **人臉辨識**：insightface buffalo_l + ArcFace（本地，免費）→ Supabase pgvector 存特徵碼 → HDBSCAN 自動分群
- **後台 UI**：makesense.ink/admin/people（像 iOS 相簿那樣命名群組）

### 客戶上傳通道（階段 5）
- Email Workers（客戶寄到專屬 email）
- LINE Bot（客戶傳照片給 LINE 帳號）
- Web 上傳頁（makesense.ink/upload/客戶代碼）
- 自動匹配 DB08 客戶 → 寫入 DB05 帶授權狀態

### 月費總結 ~$5/月（vs Cloudinary $89/月）

### 施工順序
- 階段 0（1 天）：R2 + 去重 pipeline 雛形
- 階段 1（3 天）：完整 pipeline（去重 + 人臉 + GPS）
- 階段 2（16 天）：全量遷移 17 萬張
- 階段 3（3 天）：makesense.ink/admin/people 後台 UI
- 階段 4（半天）：使用者批次命名群組
- 階段 5（5 天）：客戶上傳通道
- 階段 6（之後）：拖放 menu bar 工具（macOS app，Shift 行為控制是否重傳）

### 「拖放工具」需求（階段 6）
- macOS menu bar 小工具
- 拖檔案到圖示：上傳 R2 + 複製連結
- Shift+拖：只查雜湊，不重傳
- Cmd+拖：強制重傳
- 解決 LINE/Notion 重複上傳問題（Notion 貼 URL 自動變預覽圖；LINE 貼 URL 對方點開看）

## 「相似照片清理介面」需求（階段 1.5，2026/05/07 確定）
使用者偏好：採用「方案 C — 半自動」（像 Google Photos / iOS 重複項目介面）

### 三層去重策略
| 層級 | 偵測 | 處理方式 |
|------|------|---------|
| L1：完全相同 | SHA256 byte 比對 | ✅ 已實作，自動跳過不上傳 |
| L2：視覺相似 | pHash 感知雜湊 + 時間/GPS 條件 | 🟡 待實作 — 半自動 UI |
| L3：場景相似 | （不做，太主觀） | — |

### L2 子分類
- **連拍**：pHash 距離 < 5 + 拍攝時間差 < 10 秒
- **不同尺寸**：pHash 距離 < 8 + 解析度不同
- **視覺相似**：pHash 距離 < 12（其他情況）

### 技術堆疊
- 偵測：Pipeline 上傳時順手算 pHash → 存 Supabase `photo_phash` 表
- 索引：Supabase pgvector，hamming distance 比對
- UI：makesense.ink/admin/duplicates（Next.js 頁面）
- 操作：群組瀏覽 → 一鍵保留⭐推薦 / 手動挑 / 全保留 → 刪 R2 + archive DB05

### 系統推薦⭐ 規則（挑哪張保留）
1. 解析度最大
2. 檔案最大（原檔 vs 壓縮版）
3. EXIF 完整（有 GPS / 相機資訊代表原檔）
4. 上傳時間最早

### 觸發時機
- 階段 0（v3 全量遷移）跑完後再做
- 不急，可以累積足夠資料量再做更準

## 舊 face_db 備份保留（2026/05/09）
- 位置：`/Users/jay049/Documents/工作參考資料/face_db_backup/`
- 保留約 290KB（其餘已刪）：
  - `README.md` — 標記用途
  - `encodings.json` (160KB) — 5 人舊特徵碼（江鳳翎/康立宏/蠟筆哥哥/廖雪妙/林四九）
  - `江鳳翎_01.jpg` (81KB) — 重建素材
  - `康立宏_01.jpg` (49KB) — 重建素材
- 不上 R2，本地冷存
- 階段 2 啟動時：可能要用 ArcFace 重新生成（向量維度不同），但 5 人名單和原始照片仍有用，省得重拍
- 原 photo_processor/face_db/ 已連同整個 photo_processor/ 整夾刪除

## 「本地上傳資料夾 → R2 自動同步」需求（2026/05/10 確定）
使用者想要的是 **單向上傳**（不是雙向同步）：
- 本地放照片進指定資料夾
- 自動上 R2 + 寫 DB05（含 AI 摘要、去重）
- 在 Notion 用照片，不在本地看

### 為什麼不用 Mountain Duck / Cyberduck
- 那兩個是「R2 當本機磁碟瀏覽」（雙向，使用者看本地）
- 使用者只要單向（本地 → R2 → Notion），不需要 R2 反向下載
- 寫個監聽腳本就夠，省 $39 + 自動寫 DB05 是 Mountain Duck 做不到的

### 設計（待實作）
- 腳本：`photo_processor/watch_uploads.py`
- 監聽資料夾：`~/Documents/工作參考資料/PhotoUpload/`（待確認）
- 流程：偵測新檔 → 跑 v3 pipeline → 上傳完移到「已上傳/{年-月}/」
- 觸發時機：v3 全量遷移完成後再做

## 「嗨嗨照片」skill 需求（2026/05/10 確定，階段 4）

> ⚠️ **2026-05-10 已整併**：「嗨嗨照片」skill 已整併進「嗨嗨分析」並改名為 **hihianly**（command）/ 嗨嗨分析（中文名保留）。以下「嗨嗨照片 / hihiphoto」設計筆記屬整併前的需求記錄，現已落地為 hihianly **B 模式（DB05 照片視覺分析）**。觸發詞「嗨嗨照片」由 hihianly 自動偵測 page 條件（DB05 + 內容類型=內容素材 + 素材類別=圖像 + 圖像備項=照片）切換到 B 模式。實際工作規格以 `~/.claude/commands/hihianly.md` 為準。


### 觸發詞
「嗨嗨照片」/ hihiphoto / 「審查照片」/ 「照片連結缺什麼」

### 工作對象
**Notion DB05 的記錄**（不是 R2 也不是本地）
- 過濾條件：內容類型=內容素材 + 素材類別=圖像 + 圖像備項=照片
- R2 = 純儲存，不需審核
- 本地 = 串流 pipeline 不落地，沒檔案
- 所有 metadata + relation + 摘要都在 Notion → 審核就審 Notion

### 功能
1. **撈統計**：哪些照片缺對應地點/協作/對象/管考 relation
2. **自動補**：可信度高的自動寫 relation
3. **列人工清單**：信心度低或多選一的丟給使用者決定
4. **重生摘要**：照規範重寫 執行備註

### 處理範圍（指令範例）
- 「嗨嗨照片，全部檢查」→ 跑全量
- 「嗨嗨照片，自動補可補的」→ 自動 relation
- 「嗨嗨照片，列出 2024-07 月校長宿舍那批」→ 過濾範圍
- 「嗨嗨照片，重生 執行備註」→ 重寫摘要

### 依賴前置
- 階段 1 完成（GPS / DB04 配對邏輯就緒）
- 階段 2 完成（人臉辨識資料就緒）
- 階段 1.5 可有可無

## 四個照片問題對照表（2026/05/10）
1. 對應 DB04 / DB05 / DB07 → 階段 1（GPS + 日期配對）
2. DB08 人物對應 → 階段 2（人臉辨識）
3. 備註給文案查找 → 階段 1 加強 執行備註 語意化
4. 隨時呼叫審查 skill → 階段 4 新增 hihiphoto skill

## 圖像視覺分析合併到 hihianly（2026/05/10 確定）

### 決策
不新增 hihipic 獨立 skill，**強化 hihianly 加入視覺分析能力**。

理由：避免兩個 skill 重疊，統一在 分析備註 / 執行備註 一個入口處理。

### 強化內容
hihianly 處理 DB05 記錄時，**判斷素材類別=圖像** 就自動啟動：

1. 從「上傳檔案」抓 R2 公開 URL
2. 用 vision LLM（Claude Haiku / Sonnet）看圖
3. 寫進「執行備註」：
   - 圖中物件 / 人數 / 場景描述
   - 文字 OCR
   - 建議的 relation（對應對象、對應協作、對應庫存等候選）
4. 同時跑既有的 分析備註 寫入

### 不做的
- ❌ 不直接寫 relation（只在摘要建議候選，由人/總管確認）
- ❌ 不生圖、不修圖
- ❌ 不換掉 hihiwriter / hihianly 的核心職責

### 成本
- Claude Haiku：~$20 USD 掃 26K 張（適合大量）
- Claude Sonnet：~$120 USD 同樣量（適合需要精準場合）
- 新照片進來：每張 < $0.001

### 觸發時機
- 全量首次啟動：v3 全量遷移完成後
- 之後：每次新照片寫進 DB05，hihianly 自動 / 手動觸發

## 嗨嗨分析（強化版）互動模式設計（2026/05/10 確定）

### 工作模式：互動審查（像 check3&2）
不自動寫，先報告 → 等使用者決策 → 才執行。

### 三類對話指令

**1. 主動查詢類**
- 「還有沒有哪些照片需要整理？」→ 未審查統計 + 分布 + 建議優先批
- 「我有多少照片已經連結了？」→ 進度報告
- 「2024 年的整理完了嗎？」→ 該年度狀態

**2. 開始審查類（指定範圍）**
- 「檢查 校長宿舍 7 月那批」→ 單一資料夾
- 「檢查 2024-07 所有照片」→ 日期範圍
- 「檢查 moku 羅東 site」→ 整個 site
- 「先檢查最重要的」→ 自動排序

**3. 決策回應類**
- 「全套用」/「只套地點」/「跳過」/「DB04 改成 ooo」/「下一批」/「停」

### 報告格式（建議用）
```
📊 統計（總數、已完成、待審）
📁 範圍（資料夾 / 日期 / site）
🎯 推測（地點/活動/計畫，含信心度）
🖼️ 視覺分析（vision LLM 識別物件、場景）
💡 建議連結 relation
❓ 你決定？1️⃣全套 2️⃣部分 3️⃣跳過 4️⃣改
```

### 進度追蹤
用 DB05 既有 status 欄位記：
- `待自動連結`（pipeline 預設）
- `已連結`（你套用建議後）
- `跳過`（你說跳過）
- `待人工`（信心低或多選一）

下次「嗨嗨分析，繼續」會從待審的開始。

### 排序邏輯（「最重要的」）
1. 最近活動（執行時間越近優先）
2. 量大（單一資料夾 30+ 張）
3. 配對信心高（GPS 配對到 / DB04 日期吻合）
4. 你最常用的 site（之後可學習）

## 嗨嗨分析強化版補充（2026/05/10）

### 新增能力 1：主動偵測待處理
- 「列出有人臉但未辨識的」
- 「列出缺地點的」
- 「列出我還沒看過的」
- 「2024 年的整理完了嗎」
- 內部用 Notion API 篩選 + contains/does_not_contain

### 新增能力 2：「不需要 X」永久記住

#### 寫入位置：執行備註 欄位（不改 schema）
執行備註 末尾加一個「審查記錄」區塊：

```
... (前面的基本 metadata)
[檔名] IMG_6297.JPG
[SHA256] 9c812bcbf6d9478d...
[R2] photos/9c/81/9c812bcbf6...jpg

─── 審查記錄 ───
[審查] 不需人物 (2026-05-10)
[審查] 已連結地點 (2026-05-10)
```

#### 標籤詞彙（固定字串，hihianly 認得）
- `[審查] 不需人物` / `[審查] 不需地點` / `[審查] 不需活動` / `[審查] 不需商品` / `[審查] 不需計畫`
- `[審查] 完全跳過`
- `[審查] 已連結人物` / `[審查] 已連結地點` / `[審查] 已連結活動`
- `[審查] 已完整`

#### 篩選邏輯（hihianly 用 Notion API）
找需要連結地點的：
```
AND:
  對應地點 is empty
  執行備註 does_not_contain "[審查] 不需地點"
  執行備註 does_not_contain "[審查] 完全跳過"
  執行備註 does_not_contain "[審查] 已連結地點"
```

#### 為什麼這樣
- 不改 DB05 schema（已經有夠多欄位）
- 可審計（每筆有日期）
- 可累積（一張照片多個標籤）
- 跟 執行備註 整體放一起，AI 一次讀就懂

## 視覺分析「先篩相似再分析」優化（2026/05/10 確定）

### 問題
之前 photo_vision_analyzer.py 設計沒考慮到：
- 連拍、不同尺寸版本、裁切版照片，vision 分析結果幾乎一樣
- 全部分析會浪費 30-40% 的成本和時間

### 解法：vision 前先跑 pHash 預篩
1. **本地算 pHash**（imagehash 套件免費）
2. **hamming distance 分群**（< 5 視為高度相似）
3. **每群選代表**（最大解析度 / 最大檔案 / EXIF 最完整）
4. **只送代表照進 vision LLM**
5. **結果套用到群組所有成員**

### 預估省錢
26K 張預估 30-40% 是相似版本 → 省 NT$200 (Haiku) / NT$3,000 (Sonnet)

### 待做
- 改寫 photo_vision_analyzer.py 加入 pHash 預篩
- 或寫獨立的 photo_phash_grouper.py 先跑分群
- 跟階段 1.5「相似照片清理介面」可以共用 pHash 計算結果

## 已完成的工具（2026/05/10）

### photo_relation_matcher.py ✅
- GPS 配對 DB08 地點（嚴格 < 1km）
- 日期+資料夾關鍵字配對 DB04（嚴格不誤配）
- 透過 DB04 接力 DB02 / DB03 / DB01
- 寫 [審查] 標籤
- 已連結的會跳過
- 試跑 14 張：6 張配對成功（GPS 全中、DB04 沒對應記錄不亂配）

### photo_vision_analyzer.py ✅
- Claude Haiku / Sonnet vision 分析
- 自動壓縮過大圖（> 4MB resize 到 1600 短邊）
- 寫進 執行備註 「─── 視覺分析 ───」區塊
- 試跑 14 張：全成功，花費 $0.008 USD
- ✅ **2026/05/10 加入 pHash 預篩**（imagehash 套件）
  - 預設啟用，`--no-phash` 關閉
  - hamming distance < 5（`--phash-threshold` 可調）視為相似群
  - 每群只送代表照（解析度最大優先）進 vision，鏡像群套用同分析
  - 鏡像 page 在 執行備註 加 `[視覺源] {代表 page_id}` 標記
  - phash 結果快取在 `phash_cache.json`（key=page_id）
  - 預估省 30-40% Anthropic 費用
