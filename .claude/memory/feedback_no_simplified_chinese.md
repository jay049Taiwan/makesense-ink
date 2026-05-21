---
name: 不喜歡簡體中文、入庫一律轉繁體
description: 四九 不喜歡簡體中文，任何採集進 Notion（尤其 DB06）的內容必須先簡→繁轉換
type: feedback
originSessionId: 1b3a5699-e533-4a32-96c0-6a655044695f
---

## What
任何從簡體中文來源採集的內容，寫進 Notion（尤其 DB06 參考資料）之前，
必須先做簡→繁轉換。四九 明確說「我不喜歡簡體中文」。

## Why
四九 個人閱讀偏好。Notion 是他自己用的知識庫。

## How to apply
- 轉換工具：`opencc-python-reimplemented`，config 用 **`s2tw`**（只轉字形 +
  台灣字形標準，**不轉用詞** — 軟件仍是軟件、信息仍是信息）。
- 四九 選 s2tw 而非 s2twp，因為要忠於原文、只去掉簡體字。
- scout_lib.py 的 `s2tw()` 函式已封裝；`md_to_blocks(md, convert=True)`
  會自動套用。
