---
description: "Mission brief — 四九 要把當下話題帶到別 session 處理。只整理「當前話題」這個 mission 的脈絡（不像 sbrief 涵蓋整個 session），輸出可貼到新對話、聚焦執行該任務。"
argument-hint: "[可選：指明哪個話題、哪個任務，例「照片整理」「DB05 重構」]"
---

# /mbrief — Mission Brief 任務外送單

四九 要把**當前正在討論的某個任務**獨立帶到別處處理（另開 Claude session、外包給合作者、放到 Notion 任務單）。

## 跟 sbrief 的區別
- **sbrief** = 整個 session 的全貌（換 session 用）
- **mbrief** = 只當前話題（一個任務獨立外送）

## 鐵律
1. **只談當下這個 mission，不講 session 其他事**
2. **以 code block 包整段**讓 四九 一鍵複製
3. **不超過 800 字**（聚焦）
4. **講話確實**：不確定就標
5. **繁中**

## 輸出格式

```
# Mission Brief — <任務名稱>

## 任務目標
<一句話說清要做什麼>

## 背景脈絡（最少必要）
<為什麼做、相關的人/專案/檔案，3-5 行內>

## 現況（已做了什麼）
- <條列、最多 5 項>

## 還沒做 / 要繼續做的
- <條列、最多 5 項>

## 卡點 / 等決策
<如果有就列，沒有就略>

## 相關資源
- 檔案：<必要路徑>
- Notion page：<必要 ID>
- 其他人：<相關聯絡>

## 接手提示
- 公司品牌：makesense（不是 xiansai）
- 四九 = 決策者、不是工程師
- 偏好：見 noah-communication-style

## 執行指引
請以以上為準，先 <第一個動作>，遇到 <某種情況> 時來問 四九。
```

## Step 1：判讀「當前 mission」

掃描最近 5-10 輪對話，找：
- 四九 最近一直在問/做的某件事
- 跟 session 其他話題能切割的獨立任務

如果一個 session 有多個 mission（例如同時在搞照片整理跟 Notion schema），**問 四九 要 brief 哪個**：
> 「我看到當前 session 有 X、Y 兩條主線，你要 brief 哪一條？」

如 `$ARGUMENTS` 已指明 → 不問、直接做。

## Step 2：聚焦萃取

只抓跟該 mission 相關的：
- 已完成的步驟
- 待做的步驟
- 涉及的檔案 / Notion page / 帳號

**忽略**該 session 中其他話題的雜訊。

## Step 3：輸出
四個反引號包整段 markdown（內部可能有三反引號）。結尾加：
> 「貼到新對話前可以加『請依此 mission brief 接手執行』」

## 四九 給的偏好

`$ARGUMENTS`
