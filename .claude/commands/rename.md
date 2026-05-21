---
description: "改名為「YYYY-MM-DD_上層資料夾_原檔名」格式。支援單檔或多檔，預設用 mtime。已含日期前綴會跳過、同名衝突自動加 (2)。"
argument-hint: "[檔案路徑，可多個]"
---

# rename — 日期+資料夾前綴改名

執行 `~/scripts/rename-folder-prefix.py`，把指定檔案改名為 `YYYY-MM-DD_上層資料夾_原檔名.副檔名`。

## 流程

1. 解析 `$ARGUMENTS` 為檔案路徑列表
2. 沒給路徑 → 列出 `~/Desktop` 最近 10 個檔案讓 四九 挑
3. 跑：
   ```bash
   /usr/bin/python3 "$HOME/scripts/rename-folder-prefix.py" <files>
   ```
4. 逐檔回報結果

## 規格

- 日期來源：檔案 mtime（修改時間）
- 已含 `YYYY-MM-DD` 前綴的檔案：跳過（不重複加）
- 同名衝突：自動加 `(2)`、`(3)`
- 副檔名保留

## 安全

- 用 `shutil.move`（保險）
- 失敗會回報、不靜默吞錯
- 一筆一筆做，不會 batch 失敗一個就停

## 四九 給的參數

`$ARGUMENTS`
