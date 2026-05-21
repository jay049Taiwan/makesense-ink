---
name: 嗨嗨分析固定執行流程（手動觸發版）
description: 手動跑嗨嗨分析時，先建 DB06 baton 再分析、做完改 baton 完成的標準流程
type: project
originSessionId: 306d62cb-fef6-4b79-a4fc-359b08d10a3d
---

## What
以後常有資料要分析（例：成果報告書一份一份來）。手動跑嗨嗨分析時，一律照下面三段走，不再抄捷徑直接寫在 target 上。

### 觸發
每份待分析的 target（DB05 等）先在它的 `對應明細` 欄掛一張 **DB06 baton**：
- `明細名稱` = 「分析｜<target 名>」
- `ai模式` = 分析
- `ai狀態` = 執行中
- `對應內容` → target（DB06→DB05 relation；會鏡射回 target 的 `對應明細`）
- `數據選項` = 內部數據 / 外部數據（自家報告通常內部）

### 執行
1. 讀 target 全文（大頁會被 fetch 存檔，用 python 切片讀完 100%，圖片 URL 濾掉）
2. 抽 5 類具名實體（人物 / 地點 / 單位 / 事件 / 議題）——**全抽全建、不判斷值不值得**；只有真通名（沒名字的咖啡店/市集）、描述型（老廟/街口）不建
3. 對 DB08 **語意查重**（title + 同義備註，正規化後比對；羅東/羅東鎮、書店/書房 視為同一）
4. target 的 `對應標籤` 連既有 DB08 或新建（新建：`經營類型=紀錄`、`簡介摘要`留空給文案、`同義備註`只從內文抽、換行分隔）。**只補不刪**
5. target 寫 `分析備註`＝ 3-token 範本 `[類型]｜[執行時間]｜[關聯 DB]`（外層全形｜、內層半形/、每 token 方括號；格式 single source = 欄位字典 §1.D）

### 收尾
- baton 寫 `執行備註`（工作對象 / 工作料 / 做了什麼 / 疑似重複 / 未做清單）
- baton `ai狀態` = 完成
- **執行備註寫在 baton（觸發頁），不寫在 target**；target 只留 `分析備註` + `對應標籤`（target 的 `執行備註` 最多留一行指標指向 baton）

### 疑似重複
DB08 既有同一實體兩筆（情況 B）→ **只標記輸出、不自己合併/刪**，待嗨嗨檢核的 merge workflow 處理（見 db_dedup_merge_capability.md）。若四九當場指定留哪筆，先各取一筆連入並在 baton 標記待合併。

## Why
- 把流程導回正規：工作指示的觸發機制本來就是「DB06 baton（ai模式+ai狀態=執行中）→ 做完 → ai狀態=完成」，baton 平常由四九/n8n 建，手動跑時改由分析自己建。
- 有 baton 才有可追溯的工作紀錄落點（執行備註），下棒/檢核接得起來。

## How to apply
四九 丟一份要分析的資料（或說「一份一份來」）時，直接照上面跑，不用再問流程。

## 關鍵 ID / 格式
- DB05 collection（登記內容）= `28a667a9-ede1-466a-9f18-419da33a8810`
- DB06 collection（清單明細，baton 建這裡）= `a809ff25-fdab-8236-b491-87496d236ac9`
- DB08 collection（關係對象，標籤建這裡）= `6934a808-b79b-4446-98dd-f699476408a0`
- relation 欄位寫入格式 = **page URL 的 JSON array 字串**（Notion MCP update/create-page 的 SQLite TEXT 欄）
- DB06 欄位：`明細名稱`(title) / `ai模式` one of [搜查,分析,聯想,企劃,文案,檢核] / `ai狀態` one of [待執行,執行中,完成] / `對應內容`→DB05

## 首例
2026-05-21 分析 DB05「2015-11-26 104實體書店成果報告書Stay旅人書店」(`2839ff25fdab814cbb85ca4ae1fb6fd2`)。baton = `3679ff25fdab813999a5c19f38ff96ba`。target 補 26 對應標籤（新建 8 DB08）、寫 3-token 分析備註。
