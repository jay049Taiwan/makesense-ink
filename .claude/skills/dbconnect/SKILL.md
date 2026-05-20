---
name: dbconnect
description: |
  DB 級「未補 X引用」掃描器。掃 Notion DB 找出 9 個 X引用 欄位全空的 page,列待辦清單,引導四九用 hihiconnect 逐筆補。
  觸發詞：`dbconnect`、「找未補 X引用 的 page」「dbconnect DB05」「dbconnect DB05 partial」「dbconnect DB05 自動」。
  與 hihiconnect 區分:hihiconnect 補單 page;dbconnect 掃 DB 找該補清單。
  只動 X引用(對稱 X被引 由 dual-sync 自動鏡射);scanner 角色,只查不寫。
---

# 啟動器（主版在 Notion）

主版 page ID：`3669ff25fdab81e3bfabf01f193277d6`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 0~4 跑：URL 解析 → 規模 check → 派子 agent 掃描 → 輸出待辦清單 → 引導 四九 挑一筆動 → invoke hihiconnect
3. 拒絕 page URL
4. 預設只列清單不動手,加 `自動` 旗標才會批次跑

## 變化指令

- `dbconnect DB05`
- `dbconnect DB05 partial` 只看部分引用空的(預設是全空)
- `dbconnect <view-url>`
- `dbconnect DB05 自動` **高風險**,批次跑

## 例外

- 給 page URL → 退件提示用 hihiconnect
- 用戶要動 X被引 → 拒絕,告知那是 dual-sync 反向自動鏡射
- 用戶要動對應X → 拒絕,告知那是直接上下游不是引用
- Notion MCP 連不上 → 告知無法執行
