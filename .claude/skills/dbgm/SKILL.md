---
name: dbgm
description: |
  DB 級「未規劃 target」掃描器。掃 Notion DB 找出執行構想為空/過短或尚未規劃的 target,列待辦清單,引導四九用 hihigm 逐筆對話補上。
  觸發詞：`dbgm`、「找未規劃的 target」「掃執行構想空」「dbgm DB04」「dbgm DB04 待發佈」「dbgm DB04 我的」。
  與 hihigm 區分:hihigm 對單 target 跑對話;dbgm 掃 DB 找該規劃的清單。
  scanner 角色,只查不寫;對話本質 1 對 1,**沒有 `自動` 模式**。
---

# 啟動器（主版在 Notion）

主版 page ID：`3669ff25fdab81379d1cea34bbb8d7ff`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 0~4 跑：URL 解析 → 規模 check → 派子 agent 掃描 → 輸出待辦清單 → 引導 四九 挑一筆動 → invoke hihigm
3. 拒絕 page URL
4. **沒有 `自動` 模式** — 對話不能 batch

## 變化指令

- `dbgm DB04` 只掃 DB04
- `dbgm DB04 待發佈` 只看狀態=待發佈
- `dbgm DB04 我的` 只看責任執行=當前使用者
- `dbgm <view-url>` 用 view 縮範圍

## 例外

- 給 page URL → 退件提示用 hihigm
- 用戶要 batch / 自動 → 拒絕,告知對話必逐筆
- Notion MCP 連不上 → 告知無法執行
