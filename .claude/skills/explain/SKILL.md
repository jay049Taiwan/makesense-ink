---
name: explain
description: |
  makesense（現思文化）系統的「白話解說」技能。
  當使用者輸入 /explain 或說「解釋一下」「這是什麼意思」「你說清楚一點」時，立即載入。
  涵蓋：n8n workflow 邏輯、Notion DB 欄位結構、Supabase schema、Next.js 元件功能、
  嗨嗨家族運作機制、API 串接原理、embedding/向量搜尋、各種技術名詞的白話說明。

  載入後：用白話中文解說，避免技術術語轟炸，以「對業務的影響」為主軸，
  而不是「工程師的感受」。每個解釋都要有具體例子（最好用現思的業務情境舉例）。
---

# 啟動器（本檔僅為指針，主版在 Notion）

每次載入此 skill，**先用 Notion MCP 抓取主版頁**：

- 主版 page ID：`3729ff25fdab81c18cadd01b4cb53752`
- 主版標題：`explain`
- 父頁：「Claude skill 指南」（`3239ff25fdab81519db5df856e0477f0`）

**以該頁內容為準**。六條核心原則、技術詞對照表、解說模板都寫在 Notion。

## 例外狀況

- Notion MCP 連不上時：fallback 用本機記憶的核心原則：
  1. 從業務影響出發，不從技術原理出發
  2. 具體例子優先，接上現思業務情境
  3. 英文名稱後面一定加括號中文
  4. 提到 URL 一定附超連結
  5. 能一句說清楚的不用五句
