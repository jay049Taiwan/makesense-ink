---
name: nowwhat-makesense
description: |
  當 四九 說「網站基本配置」「nowwhat」「現在狀況」「目前架構」「幫我漂一份介紹」「現在這邊是什麼狀況」這類話時立即載入。
  任務：抓 Notion 主版頁並把其中的快照區塊（被 ```markdown ... ``` 包起來那段）原封不動以 code block 輸出，讓 四九 能直接複製貼到別處（Claude.ai 新對話、給合作者、文件留底）。
  不要改寫、不要摘要、不要加分析、不要挑重點。
---

# 啟動器（本檔僅為指針，主版在 Notion）

主版 page ID：`3599ff25fdab81b49442d966829e308b`
主版標題：`nowwhat-makesense`
父頁：「Claude skill指南」（`3239ff25fdab81519db5df856e0477f0`）

## 觸發後流程

1. 用 Notion MCP 抓主版頁
2. 找到「快照內容」段落裡的 ` ```markdown ... ``` ` code block
3. **原封不動輸出**（連三個反引號都要保留），讓 四九 一鍵複製
4. 結尾加一句提醒：「貼到新對話前記得加『請以以上狀況為準』」

## 不要做的事

- ❌ 改寫、摘要、加註解
- ❌ 抽重點、條列摘要
- ❌ 在 code block 外面加自己的話干擾複製
- ❌ 用本機 memory 拼湊（一定要去 Notion 抓最新版）

## 例外

- Notion MCP 連不上 → 告知「主版讀取失敗，請確認 Notion MCP 狀態」，**不要 fallback 用舊資料拼**（會給 四九 過期的快照很危險）
