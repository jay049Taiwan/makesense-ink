---
name: hihigm
description: 嗨嗨總管。載入後去 Notion 讀「4-2-1-1 嗨嗨總管工作指示」並照它執行；該指南是唯一真相來源，本檔不複製規則內容。
---

# 嗨嗨總管(hihigm)

被 `/hihigm <輸入>` 觸發。

## 唯一動作：讀 Notion 指南，照它執行

1. 用 Notion MCP `fetch` 讀「嗨嗨總管工作指示」(4-2-1-1)：
   https://www.notion.so/3639ff25fdab806f9710e1e676d4ab0d
   （先 ToolSearch 載入 `mcp__…__fetch`；連同它「動手前必讀」引用的子指南——欄位組合指南等——一併讀進來）
2. 嚴格照那份指南的步驟，對 `$ARGUMENTS` 執行（連續問答補需求層 + 派工）。
3. 查詢類動作（讀 target、找對標）派並行子 agent 去做，避免母 session 偏見；寫入前後 re-fetch 驗證，失敗就回報、不裝成功。
4. 指南沒寫到的不腦補；回報並請四九補進指南。

> **設計原則**：總管的所有規則只住在 Notion 指南，本檔僅為指路牌。
> 四九改規則只改 Notion 一處，不必同步本檔。
