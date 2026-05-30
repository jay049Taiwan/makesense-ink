---
description: DB 級「未寫 page content」掃描器。掃 Notion DB 找出 page content 為空或過短(<200 字)的 page,列待辦清單,引導四九用 hihiwriter 逐筆寫。 觸發詞：`dbwriter`、「找空 page」「掃 content 空」「dbwriter DB05」「dbwriter DB05 重寫」「dbwriter DB05 5 筆」。 與 hihiwr
---

請依使用者輸入的 $ARGUMENTS 執行 DB 級 page content 掃描。

## 角色定位

- **本 skill = 掃描器**：只查不寫，找出待辦清單
- **hihiwriter = 執行器**：逐筆寫入，由本 skill 引導呼叫

## 執行流程

### Step 1：規模 check
- 估算符合條件的 page 數
- > 50 筆 → 強制 confirm 再繼續
- 預設 batch size = 10 筆

### Step 2：掃描條件
- **條件 A**：page content 完全空（只有預設 placeholder）
- **條件 B**：page content 過短（< 200 字）
- 主要掃描 DB：DB05（主）、DB08、DB07

### Step 3：輸出待辦清單
格式：頁面標題 / 缺內容程度 / hihiwriter 動筆前條件是否齊全

額外標示：
- ✅ 可動：執行構想 + voice profile + 子類指南 + 素材齊全
- ⚠️ 不該動：缺執行構想或缺企劃架構，標出缺什麼

### Step 4：引導執行
- 問：「要挑哪筆？（可說『動第 N 筆』『先不用』）」
- 挑筆 → 呼叫 `/hihiwriter <該筆 URL>`（hihiwriter 自帶動筆前確認流程）
- 寫完 → 回 Step 3 清單繼續

## 變化指令
- `dbwriter DB05` — 只掃 DB05
- `dbwriter <view-url>` — 套 view filter 縮範圍
- `dbwriter DB05 重寫` — 連有 content 的也重寫（高風險，需二次確認）
- `dbwriter DB05 5 筆` — 限筆數

## 禁止行為
- ❌ 沒有「自動」模式（寫入不可逆，必逐筆 approve）
- ❌ 跳過 hihiwriter 的動筆前確認流程直接寫
- ❌ 動筆前條件不齊全的 page 強寫
