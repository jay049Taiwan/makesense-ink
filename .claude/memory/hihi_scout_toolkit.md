---
name: 嗨嗨搜查工具箱 hihi_scout
description: 嗨嗨搜查的可重用採集工具箱（scout_lib.py）、dedao 課程封存器、R2 檔案管線位置與能力
type: project
originSessionId: 1b3a5699-e533-4a32-96c0-6a655044695f
---

## What
嗨嗨搜查的採集能力已固化成可重用工具箱，位於
`/Users/jay049/Documents/工作參考資料/hihi_scout/`。

### scout_lib.py — 核心函式庫
- `get_cookies(domain)` — 從本機 Chrome 抽 cookie（複用登入態）
- `ScoutBrowser` — Playwright context 包裝，`fetch` / `fetch_api` /
  `post_api`，內建自動重試 + backoff
- `s2tw(text)` — 簡→繁（opencc s2tw）
- `md_to_blocks(md)` — markdown → Notion blocks
- `dedup_check(url)` / `create_db06(...)` — DB06 建檔（建檔前查重對應連結）
- `download_file` / `upload_to_r2` / `file_url_to_r2` — R2 檔案上傳
- `normalize_image(path)` — 非標準圖片格式（BMP/無副檔名）自動轉 PNG
- `attach_files_to_db06` — R2 URL 寫進 DB06「上傳檔案」欄位
- `batch(...)` — 批次續跑（done 檔自動跳過、中斷可續）

### dedao_course.py — dedao 課程封存器
一行指令封存一門得到課程：
`python dedao_course.py <課程detail_id> <DB08對象page_id> <tag>`

## Why
嗨嗨搜查原本每次任務臨時寫腳本。固化成工具箱後，未來任務直接
`from scout_lib import ...`，不重寫；新課程封存從「摸索半天」變「一行指令」。

## How to apply
- 執行環境：brand_monitor venv（`brand_monitor/venv/bin/python`），
  已裝 playwright / browser-cookie3 / opencc-python-reimplemented /
  boto3 / Pillow。
- 政府/JS 網站抓取要用 ScoutBrowser（Playwright），不要用 WebFetch
  （JS 渲染頁、表單、登入態 WebFetch 做不到）。
- 政府網站對 bot User-Agent 敏感 → ScoutBrowser 已內建正常 UA + zh locale。

## R2 檔案管線（通用規則）
- 採集到的檔案 → 下載 → 上傳 Cloudflare R2 → R2 永久 URL。
- **附件文件**（PDF/DOCX/XLSX）→ R2 URL 寫進 DB06「上傳檔案」欄位。
- **內文插圖** → re-host 到 R2 + 換 image block URL，**圖留內文原位**
  （不塞「上傳檔案」欄位，否則圖文分家）。此為所有採集的通用規則。
- R2 credentials 在 `/Users/jay049/Code/makesense-ink/.env.local`
  （R2_* 變數，bucket=makesense-photos）。
- Notion image block 不支援 BMP — 非標準格式先 normalize_image 轉 PNG。
