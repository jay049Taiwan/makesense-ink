---
description: "本地端檢查總入口 — 四九 的 Mac 檔案稽核。打 /checkmac 跳 menu 問要檢查什麼類型（文件 / 照片 / PDF / 截圖 / 試算表 / 簡報 / 影音 / 任何檔案）。報告 → 等決策 → 才動。預設不刪、所有刪除動作走軟刪除。"
argument-hint: "[類型編號或關鍵字 — 不填會跳 menu]"
---

# checkmac — 本地端檢查總入口

四九 的 Mac 檔案稽核助手。**互動模式**：先問要查什麼類型 → 報告 → 等決策 → 才動。

## 鐵律

1. **絕不自動刪檔**
2. 真要刪：**走軟刪除** — 先 `mv` 到 `~/.dedupscan-trash/<timestamp>/`，不要 `rm`
3. 軟刪除前必須**列清單給 四九 看一次**，他明說「刪」「移」才動
4. 跳過系統/工具資料夾：`.git/`, `node_modules/`, `.Trash`, `Library/`, `.venv/`, `__pycache__/`, `.DS_Store`
5. 跳過 `~/.claude/`、`~/.zsh_history` 等敏感檔
6. **L5 文件相似（大同小異）絕不被自動刪**——只列給 四九 看、永遠人工裁決

## Step 1：判讀類型

解析 `$ARGUMENTS`：

| 四九 說 | 走哪條 |
|---|---|
| `1` / `文件` / `doc` / `docx` / `word` | A. 文件（doc/docx）|
| `2` / `照片` / `圖片` / `image` | B. 照片 |
| `3` / `pdf` | C. PDF |
| `4` / `截圖` / `screenshot` | D. 截圖 |
| `5` / `試算表` / `xlsx` / `excel` | E. 試算表 |
| `6` / `簡報` / `pptx` / `keynote` | F. 簡報 |
| `7` / `影音` / `影片` / `音樂` / `mp4` / `mov` | G. 影音 |
| `8` / `任何` / `全部檔案` | H. 任何檔案（不分類型） |
| `9` / `混合` / `all` | I. 各類抽精華 |
| **空白 / 沒講** | **顯示 menu** |

## Step 2：顯示 menu（無參數時）

```
🩺 checkmac — 想檢查什麼？

1️⃣ 文件（doc / docx）
   找重複 + 找「大同小異」（textutil + Jaccard，70% 以上相似才報）

2️⃣ 照片
   找完全重複 + 找視覺重複（pHash，不同尺寸/格式同源）

3️⃣ PDF
   找完全重複 + 找「大同小異」（pdftotext + Jaccard）

4️⃣ 截圖
   螢幕截圖批次盤點，建議搭配 /rename 改名

5️⃣ 試算表（xlsx）
   找完全重複（只能 hash 比，無法做相似度）

6️⃣ 簡報（pptx / keynote）
   找完全重複

7️⃣ 影音（mp4 / mov / mp3 等）
   找完全重複（hash 比）

8️⃣ 任何檔案（不分類型）
   找重複（同 hash / 同檔名）

9️⃣ 混合（從上面各類抽精華）

打數字、關鍵字或路徑都行。
```

等 四九 回應再進 Step 3。

## Step 3：判定路徑範圍

選好類型後問：
> 「掃哪？預設三個常見路徑：~/Desktop / ~/Downloads / ~/Documents/工作參考資料。或你給特定路徑（OneDrive 的話打『OneDrive』）」

預估規模（先跑 `find <paths> -type f | wc -l`）給 四九：
> 「掃描 X 個檔案，預估 N 分鐘，要繼續嗎？」

## Step 4：依類型跑檢查

### A. 文件（doc / docx）
1. 完全重複 — SHA256
2. 同檔名群組 — basename 相同 ≥ 2
3. **大同小異** — `textutil -convert txt -stdout` 抽純文字 → 切 3-gram → Jaccard 相似度 70~99%

### B. 照片
1. 完全重複 — SHA256（不同檔名也抓）
2. 同檔名群組
3. 視覺重複 — `imagehash.phash`（jpg/jpeg/png/heic/webp/gif/bmp/tiff），Hamming ≤ 5 視為同源
4. > 5000 張先警告預估時間

### C. PDF
1. 完全重複 — SHA256
2. 同檔名群組
3. **大同小異** — `pdftotext -layout` 抽純文字 → Jaccard
4. 抽不出文字（掃描型 PDF）→ 標「需 OCR」、不參與相似度

### D. 截圖
找這幾類檔名：`截圖 *`、`Screenshot *`、`螢幕截圖 *`、`SCR_*`
1. 按拍攝時間群組（同月份、同週）
2. 列前 5 批最大群（檔案數 30+ 優先）
3. 提示用 `/rename` 批次改名

### E. 試算表（xlsx）
1. 完全重複 — SHA256
2. 同檔名群組
（xlsx 沒有可靠的「文字相似度」概念——格式跟 cell 引用太雜）

### F. 簡報（pptx / keynote）
同 E。

### G. 影音
同 E。**特別跳過 < 1MB 檔**（避免雜訊）。

### H. 任何檔案
1. 完全重複（SHA256）
2. 同檔名群組
不分類型、最大膽。

### I. 混合
A+B+C 各取最強的 5 件、湊一份綜合報告。

## Step 5：報告格式

```
🩺 checkmac — [類型] @ [路徑]
掃了 X 個檔案 / 找到 K 群

── 完全重複 ─────
[群 1] 4 份 × 4 MB → 可省 12 MB
  ├─ ~/A/file.docx
  ├─ ~/B/file.docx
  ...

── 大同小異（適用文件/PDF）─────
[相似度 92%] 兩檔差一點
  A: ~/Documents/某報告.docx (12KB, 改 2024-08-15)
  B: ~/Documents/某報告_2024.docx (13KB, 改 2024-09-20)
  → 可能 B 是 A 的修訂版

決策？
1️⃣ 「全留最新」 — 留每群最新一份、其他軟刪（**只作用於完全重複，不動相似群**）
2️⃣ 「全留最大檔」 — 適合照片
3️⃣ 「全都看一遍」 — 一群一群帶你裁決
4️⃣ 「先 export csv」 — 不動、只匯出 ~/checkmac-<date>.csv
```

## Step 6：軟刪除完成後

```
✅ 已軟刪 N 個檔案、釋放 X GB
位置：~/.dedupscan-trash/<YYYY-MM-DD-HHMM>/
30 天後可進去用 `rm -rf` 真刪，或撈回原位
```
寫 MANIFEST.txt 記每筆 from → to。

## Edge cases

- **檔案 < 1 byte**：跳過
- **symlink**：不跟、只看本體
- **macOS bundle**（`.app`、`.pages`）：當單一檔處理
- **iCloud / OneDrive 雲端佔位**：用 `stat -f %b` 判斷 block=0 = 雲端、跳過（不觸發下載）
- **掃描中斷**：每 100 個檔案存進度到 `~/.checkmac-progress.json`，可續掃
- **textutil / pdftotext 失敗**：跳過、列「無法抽文字 N 個」

## 命名範例

- `/checkmac` — 跳 menu
- `/checkmac 文件` — A 類，會問路徑
- `/checkmac 照片 ~/Pictures` — B 類 + 指定路徑
- `/checkmac pdf OneDrive` — C 類 + OneDrive
- `/checkmac 截圖` — D 類
- `/checkmac 8 ~/Downloads` — H 類（任何檔案）+ Downloads

## 四九 給的參數

`$ARGUMENTS`
