---
name: 專案架構（photo_processor + Discord Bot）— LEGACY
description: ⚠️ Discord Bot「嗨嗨」已暫停使用。本檔保留為歷史紀錄。本機 Notion DB 編號已改為 DB01~DB09（9 個）。Discord 頻道命名沿用舊版（#06-互動關係對象實際對應 DB08；#08-日期時段記錄實際對應 DB09）。
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
# 專案架構

> ⚠️ **本檔內容全數已退役 / 程式碼已刪除**（photo_processor/ 2026/05/09 刪、Discord Bot 退役），僅留歷史記錄；新架構見 `~/CLAUDE.md`。

> ⚠️ **狀態提醒（2026/04/19 更新）**：
> - Discord Bot「嗨嗨」已暫停使用，預計改用 Telegram Bot（見 telegram_bot_setup.md）
> - 本檔的 Notion 系統實際是 9 個 DB（DB01~DB09），Discord 頻道命名與 Notion DB 編號不同步
> - 真正的 DB 結構請看 `notion_structure.md` 和 `/Users/jay049/CLAUDE.md`

## Discord 頻道結構（17 頻道 + 4 分類）
```
📂 組織架構
├── #L1-一般專員    ← Sonnet
├── #L2-儲備管理    ← Sonnet
├── #L3-專案經理    ← Sonnet
├── #L4-品牌經營    ← Opus
└── #L5-事業總籌    ← Opus

📂 資料庫（全部用 Haiku）
├── #01-品牌經營提案
├── #02-專案績效管考
├── #03-工作項目進度    ← 對應 Notion DB03 項目進度（頻道名沿用舊稱）
├── #04-共識交接協作    ← 對應 Notion DB04 協作交接（⚠️ DB04 現稱「協作交接」，頻道名沿用舊稱）
├── #05-登記內容
├── #06-互動關係對象    ← 對應 Notion DB08 關係對象（頻道名沿用舊稱）
├── #07-庫存資產控管    ← 對應 Notion DB07 庫存控管（頻道名沿用舊稱）
└── #08-日期時段記錄    ← 對應 Notion DB09 日期紀錄（頻道名沿用舊稱）

📂 社群網站（全部用 Haiku）
├── #LINE官方帳號
├── #旅人書店FB粉專
└── #旅人書店-宜蘭文化俱樂部

📂 系統
└── #🔔中控系統      ← Sonnet
```

## 工作流程
1. Notion DB 異動 → Bot 偵測（每 2 分鐘輪詢，含 debounce）
2. 對應 DB 頻道出現留言
3. Bot 私訊使用者（帶按鈕：知道了 / 給指示 / 稍後處理）
4. 使用者回覆 → Bot 轉貼到頻道 → 執行對應工作
5. L1~L5 的具體工作可能跨多個 DB，各 DB 頻道也會記錄被動作的訊息

## 照片處理流程（2026/04 方向轉為從 DB05 出發）
舊流程：本地監控 → 處理 → 寫入 DB05
新流程：手動上傳 DB05 → n8n 偵測 → Cloudflare R2 儲存 → EXIF → 人臉辨識 → 回填 DB05

## 檔案清單
- config.py — 所有設定
- processor.py — 照片處理核心
- main.py — 資料夾監控入口
- discord_bot.py — Discord Bot 主程式
- identify_faces.py — 人臉指認工具
- discord_channels.json — 頻道 ID 對應
- notion_poll_state.json — Notion 輪詢狀態
- face_db/ — 人臉資料庫

## Claude API 模型分級
- Opus：L4 品牌經營、L5 事業總籌
- Sonnet：L1、L2、L3、🔔中控系統
- Haiku：8 個資料庫頻道、3 個社群頻道、Bot 私訊

## 指南文件
- 系統總論指南：`2869ff25fdab80c6a266f1228f8bd587`
- 資料庫類別指南：`3279ff25fdab80a18fffff56c578a86a`
- 組織架構指南：`3289ff25fdab80fa90b8f5d408a366fa`
- 文案撰寫指南：`3279ff25fdab80aaa42be8d6dd91daed`
- 圖像製作指南：`3299ff25fdab8040bcaad28122bebff8`
- 官網維護指南：`32c9ff25fdab81389368eac6f77bc417`
- 官網內容撰寫指南：`3329ff25fdab8017b9a3eae1fb7fb5a2`
- 各類指南總頁：`2799ff25fdab80fea78ee261b4e792a2`
