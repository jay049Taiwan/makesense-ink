---
name: makesense-guide-router
description: |
  makesense（四九/sms）跨任務的指南導航 meta-skill。動手前強制先查 Notion 指南。
  當使用者請求涉及以下任何情境時立即載入：
  - DB01~DB09 任一資料庫的建檔、查詢、修改（資源提案/績效管考/項目進度/協作交接/登記內容/清單明細/庫存控管/關係對象/日期紀錄）
  - 文案撰寫（網頁、社群、新聞稿、提案、報告、教案、網頁社群、論述、腳本）
  - 圖像、影片、音訊處理（含照片整理、素材歸檔）
  - 庫存異動、報名登記、互動聯繫、值班顧店等執行類工作
  - 嗨嗨家族成員（嗨嗨總管等 Telegram Bot）的工作分派
  - 觸到「指南」「決策樹」「風格」「規範」「該寫進哪個 DB」這類問題

  載入後鐵律：動手前先去 Notion 查對應指南，沒查不動手。
---

# 啟動器（本檔僅為指針，主版在 Notion）

每次載入此 skill，**先用 Notion MCP 抓取主版頁**：

- 主版 page ID：`3599ff25fdab8199869dfd35760d5623`
- 主版標題：`makesense-guide-router`
- 父頁：「Claude skill指南」（`3239ff25fdab81519db5df856e0477f0`）

**以該頁內容為準**。內文（指南總目錄、查詢順序、鐵律、自我檢查清單）全部寫在 Notion，本檔不重複。

## 為什麼用啟動器模式

- Claude Code 與 Claude.ai 兩邊本機的 SKILL.md 都是啟動器，內容同步來源是 Notion
- 改 skill 只改 Notion 主版，下次兩邊載入自動讀新版
- 避免兩邊飄移

## 例外狀況

- Notion MCP 連不上時：fallback 用本機 memory `notion_structure.md` + CLAUDE.md，並告知使用者「主版讀取失敗，當前依本機快取行動」
- 純定義/解釋類問題（如「DB05 是什麼」），既有 memory 已涵蓋的可直接答（不必每次跑 Notion）

## 嗨嗨家族能力與權限矩陣

- 6 棒（企劃/搜查/分析/聯想/文案/檢核）的核心能力與特殊權限，single source of truth = Notion 工作導覽地圖 `3459ff25fdab81aeab9ff3c8281805e5` §家族能力與權限矩陣。
- 任何 session 要查家族現況、或升級某棒前看現狀 → 用 `/hihimatrix`。
- **鐵律：任何 session 改動某棒的能力或特殊權限 → 必須在同一次把該矩陣一起更新**，否則各 session 各改一棒會脫鉤。

## 與其他 skill 的關係

- `n8n-makesense`：n8n workflow 細節（並行）
- 本機 memory MD：`~/.claude/projects/-Users-jay049-Documents-------/memory/`（Claude Code 才看得到，Claude.ai 沒有）
