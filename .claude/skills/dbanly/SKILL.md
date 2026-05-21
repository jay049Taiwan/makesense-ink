---
name: dbanly
description: |
  DB 級「未補對應標籤」掃描器。掃 Notion DB 找出對應標籤/對應對象 relation 為空的 page,列待辦清單,引導四九用 hihianly 逐筆補。
  觸發詞：`dbanly`、「找未標籤的 page」「掃對應標籤空」「dbanly DB05」「dbanly DB05 自動」。
  與 hihianly 區分:hihianly 補單 page;dbanly 掃 DB 找該補清單。
  scanner 角色,只查不寫;`自動` 旗標才會批次跑 hihianly。
---

# 啟動器（主版在 Notion）

主版 page ID：`3669ff25fdab81069081da2725df5b5b`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 0~4 跑：URL 解析 → 規模 check → 派子 agent 掃描 → 輸出待辦清單 → 引導 四九 挑一筆動 → invoke hihianly
3. 拒絕 page URL
4. 預設只列清單不動手,加 `自動` 旗標才會批次跑

## 變化指令

- `dbanly DB05`
- `dbanly <view-url>` 用 view 縮範圍
- `dbanly DB05 自動` **中風險**,批次跑 hihianly

## 例外

- 給 page URL → 退件提示用 hihianly
- Notion MCP 連不上 → 告知無法執行
