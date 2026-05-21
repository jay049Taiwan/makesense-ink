---
name: 劉潤課程知識庫已封存進 DB06
description: 得到（dedao）劉潤兩門 5分鐘商學院課程全文已封存進 DB06，對應對象→DB08 劉潤
type: project
originSessionId: 1b3a5699-e533-4a32-96c0-6a655044695f
---

## What
四九已付費的得到（dedao.cn）劉潤課程，全 4 門系列全文已封存進 Notion DB06
（合計約 752 篇）：

| 課程 | 講次數 | detail_id |
|---|---|---|
| 5分鐘商學院·基礎 | 339 | lQr3o4dMw8ZKgdasgrV7N2xDyWeEq1 |
| 5分鐘商學院·實戰 | 342 | WOY8PNZj5EavJqdSGVn1eqGDdlgw7k |
| 第三門 | 40 | v12pOMZN7mbJwgMs2pJDrjxdYaGkoE |
| 第四門（最後一堂）| 31 | nb9L2q1e3OxKBPNsZZJrgN8P0Rwo6B |

每篇 = 一筆 DB06 page：明細類型=資料參考、參考類別=企劃參考、
對應連結=得到原文 URL、對應對象→DB08「劉潤」page
（`3619ff25-fdab-80af-9870-d4dc187277ec`）、page content=繁體全文。
內文插圖全部 re-host 到 Cloudflare R2（不依賴得到 CDN）。

## Why
四九要建知識庫護城河。已付費課程、純內部個人筆記用途、不外流。
四九判定此用途合法（付費用戶 + 自用 + 不散佈）。

## How to apply
- 之後其他得到課程比照：`dedao_course.py <detail_id> <DB08 page> <tag>`，
  再跑 dedao_rehost 類腳本 re-host 圖片。
- 嗨嗨搜查只搬全文進來、不做摘要（摘要是嗨嗨分析/企劃的事）。
- 全文是簡→繁（s2tw）轉換後存入。
