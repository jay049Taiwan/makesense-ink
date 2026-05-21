---
name: dbwriter
description: |
  DB 級「未寫 page content」掃描器。掃 Notion DB 找出 page content 為空或過短(<200 字)的 page,列待辦清單,引導四九用 hihiwriter 逐筆寫。
  觸發詞：`dbwriter`、「找空 page」「掃 content 空」「dbwriter DB05」「dbwriter DB05 重寫」「dbwriter DB05 5 筆」。
  與 hihiwriter 區分:hihiwriter 寫單 page;dbwriter 掃 DB 找該寫清單。
  scanner 角色,只查不寫;**安全閾值最高**,寫入不可逆,**沒有 `自動` 模式**,逐筆 approve。
---

# 啟動器（主版在 Notion）

主版 page ID：`3669ff25fdab81ada9bffd16d7d78ee1`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 0~4 跑：URL 解析 → 規模 check → 派子 agent 掃描 → 輸出待辦清單(標示 hihiwriter 動筆前條件是否齊全) → 引導 四九 挑一筆動 → invoke hihiwriter
3. 拒絕 page URL
4. **沒有 `自動` 模式** — content 寫入不可逆,必逐筆 approve
5. batch size 10 筆(content 寫入耗 token 大)

## 變化指令

- `dbwriter DB05`
- `dbwriter <view-url>` 用 view 縮範圍
- `dbwriter DB05 重寫` 連有 content 的也重寫(高風險)
- `dbwriter DB05 5 筆` 限筆數

## 例外

- 給 page URL → 退件提示用 hihiwriter
- 用戶要 batch / 自動 → 拒絕,告知寫入必逐筆 approve
- hihiwriter 動筆前條件不齊(執行構想/voice profile/素材缺) → 該筆標 ⚠ 不該動
- Notion MCP 連不上 → 告知無法執行
