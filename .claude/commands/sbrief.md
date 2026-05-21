---
description: "Session brief — 四九 要換 session 接力。整理整個當前 session 的工作脈絡：做了什麼、決定了什麼、改了哪些檔、下一步是什麼。輸出可直接貼到新對話的 brief。"
argument-hint: "[可選：偏重哪部分，例「只要技術決定」「省略雜談」]"
---

# /sbrief — Session Brief 接力產生器

四九 要換 session 時觸發。任務：把**整個當前 session** 的脈絡濃縮成一份新對話可直接貼的 brief。

## 鐵律
1. **以 code block 包整段輸出**（讓 四九 一鍵複製）
2. **不超過 1500 字**（再多新對話讀不下）
3. **講話要確實**：不確定的事註明「不確定」，不要為了完整性編
4. **繁中**

## 輸出格式

```
# Session Brief — <YYYY-MM-DD HH:MM>

## 背景
<這次 session 在做什麼大方向>

## 已完成
- <條列、最多 10 項>
- 每項附動到的檔/路徑/page ID

## 進行中
<目前正在處理但沒完的事；如果沒有就略>

## 待決定 / 等 四九 決策
- <列項>

## 下一步建議
<接 session 的 Claude 應該優先做什麼，1-3 項>

## 重要 context（讓接 session 的 Claude 不要重複問）
- 公司品牌：makesense（不要寫 xiansai）
- 角色：四九 = 決策者、不是工程師
- 偏好：見 noah-communication-style skill
- 當前主力專案：makesense.ink
- 相關檔案：<列出本次 session 動到的檔>
- 相關 Notion page IDs：<列出本次 session 提到的>

## 接力提醒
請以以上內容為準，不要重複問 四九「公司是什麼」「在做什麼專案」這類已知背景。
```

## Step 1：抓 session 脈絡

回看整個對話：
- 開頭 四九 提了什麼任務 / 痛點？
- 我們做了哪些動作？建了什麼檔、改了什麼設定、寫了什麼 Notion？
- 結論在哪邊？卡在哪邊？

## Step 2：根據 `$ARGUMENTS` 偏重

無參數 → 全面 brief
有參數（例「只要技術決定」）→ 對應裁剪

## Step 3：輸出

整段 markdown 包進 ` ```` ` 四個反引號內（內部可能有三個反引號），讓 四九 直接複製貼到 Claude.ai 新對話或新 Claude Code session。

結尾加一句：「貼到新對話前可以加『請以以上 brief 為準，繼續執行 X 任務』」

## 四九 給的偏好

`$ARGUMENTS`
