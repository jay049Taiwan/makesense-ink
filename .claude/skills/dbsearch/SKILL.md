---
name: dbsearch
description: |
  DB 級「未抓資料」掃描器。掃 Notion DB 找出有 source URL 但內容欄位空、或應有 source URL 但漏抓的 page,列待辦清單,引導四九用 hihisearch 逐筆抓。
  觸發詞：`dbsearch`、「找未抓的引用」「掃 DB URL 待辦」「dbsearch DB06」「dbsearch DB06 自動」。
  與 hihisearch 區分:hihisearch 接外部 URL 抓單筆;dbsearch 掃 DB 找待抓清單。
  scanner 角色,只查不寫;`自動` 旗標才會批次跑 hihisearch。
---

# 啟動器（主版在 Notion）

主版 page ID：`3669ff25fdab81fc8e50d48e702e9ec2`
父頁：「Claude skill指南」

## 觸發後

1. 抓主版頁拿最新流程
2. 依主版 Step 0~4 跑：URL 解析 → 規模 check → 派子 agent 掃描 → 輸出待辦清單 → 引導 四九 挑一筆動 → invoke hihisearch
3. 拒絕 page URL
4. 預設只列清單不動手,加 `自動` 旗標才會批次跑

## 變化指令

- `dbsearch DB06` 只掃 DB06
- `dbsearch <view-url>` 用 view 縮範圍
- `dbsearch DB06 自動` **高風險**,批次跑 hihisearch 不逐筆挑
- `dbsearch DB06 漏記` 只看條件 B(應有 URL 但欄位空)
- `dbsearch DB06 未抓` 只看條件 A(有 URL 但內容空,預設)

## 例外

- 給 page URL → 退件提示用 hihisearch
- Notion MCP 連不上 → 告知無法執行
