---
name: n8n-makesense
description: |
  makesense（現思文化）的 n8n workflow 設計與建立專用手冊。
  當使用者提到以下任何情境時，立即載入此 skill：
  - 建立、修改、設計 n8n workflow
  - 說「幫我做一個自動化」、「我想讓 n8n...」
  - 討論 Notion ↔ n8n ↔ Supabase 的整合
  - 提到 DB01~DB09（資源提案、績效管考、項目進度、協作交接、登記內容、清單明細、庫存控管、關係對象、日期紀錄）、庫存、封存、辨識、提煉、貨項進出等現思系統詞彙
  - 任何涉及 Zeabur、makesense.ink、makesense.zeabur.app 的技術討論

  載入後：直接套用本手冊的規格，不需要再詢問 Credential ID、系統架構等已知資訊。
  DB ID、資料庫分工、業務規則等以 Notion 為準，執行前先抓取。
---

# 現思文化 n8n Workflow 設計手冊

## 零、執行前必讀（Notion 即時資料）

**每次啟動此 Skill，先用 Notion MCP 抓取以下頁面，取得最新 DB ID 與業務規則：**

| 頁面 | 用途 | Page ID |
|------|------|---------|
| 資料庫類別指南 | DB 編號、Collection ID、分工邏輯 | `3279ff25fdab80a18fffff56c578a86a` |
| 系統總論指南 | 整體架構、XYZ 三軸說明 | `2869ff25fdab80c6a266f1228f8bd587` |
| 官網維護指南 | makesense.ink 同步機制、5 條 webhook | `32c9ff25fdab81389368eac6f77bc417` |

從 Notion 取得的資料優先於本文件任何舊版記錄。若 Notion 無法連線，再使用本文件的備用資料。

---

## 一、系統架構速查（2026/04 大改後）

### 主機與端點
- **n8n**：`https://makesense.zeabur.app`（self-hosted, v2.1.4）
- **官網**：`https://makesense.ink`（Next.js 16 + Vercel + Supabase）— **現役主力**
- **Supabase**：`https://zgwdomvauuxaxtgqqvrn.supabase.co`
- **Notion API**：`https://api.notion.com/v1/`
- ~~`https://makesense.site`（WooCommerce）~~ **已於 2026/04 退役，不再維護**

### 資料流向（雙向，現役）
```
Notion ←→ Supabase ←→ makesense.ink
   ↑          ↑
n8n daily   即時 webhook
sync 8AM    （Notion「發佈更新」按鈕）
```

- **Notion 是內容真相來源**（編輯人員的工作介面）
- **Supabase 是程式運作基礎**（官網讀取、會員交易高頻寫入）
- **庫存真相 = Supabase `products.stock`**（DB06 進貨/出貨/盤點 → 直接更新）
- ~~WP `stock_quantity`~~ **已不再使用**

---

## 二、Credentials（直接使用，不需再問）

| 用途 | 類型 | Credential ID | 狀態 |
|------|------|--------------|------|
| Notion API | notionApi / HTTP Header Auth | `PiXWlzhPKErr7TNX` | 現役 |
| Supabase（service_role）| HTTP Header Auth | （n8n 內查詢）| 現役 |
| Anthropic API | 環境變數 `ANTHROPIC_API_KEY` | — | 現役（在 Zeabur 設定）|
| OpenAI Whisper | 環境變數 `OPENAI_API_KEY` | — | 現役 |
| ~~WooCommerce REST API~~ | ~~httpBasicAuth~~ | ~~Il1kZIud6BscF71H~~ | **已退役（WP 站關閉）** |

---

## 三、n8n 節點規則（踩過的坑，必須遵守）

### HTTP Request → Notion API
```
bodyType: （留空，不填 json）
rawContentType: application/json
sendBody: true
```
**錯誤示範**：`bodyType: json` → 會導致 body 被清空，Notion 收到空物件。

### respondToWebhook 節點
Response Body **只接受靜態 JSON 字串**，不支援 expression：
```json
{"status": "ok"}
```
不可寫：`={{ JSON.stringify($json) }}`（會報錯）

### Code 節點處理多 item
HTTP Request 節點在 Split Items 之後會破壞 item pairing，**必須用 `runOnceForAllItems` + index 對應**：
```javascript
const allItems = $input.all();
return allItems.map(function(wrapper, i) {
  const prev = $('前一個節點').all()[i].json;
  // ...
});
```

### Notion Relation 欄位格式
關聯欄位值必須是移除 UUID 橫線的 32 字元 ID，包在 JSON 字串陣列裡：
```javascript
// 正確
"[\"https://www.notion.so/" + pageId.replace(/-/g, '') + "\"]"
// 錯誤
pageId  // 直接用 UUID 會失敗
```

### Notion 多欄位同時 PATCH 的雷
- `分析備註` 與 `簡介摘要` 不能同一個 patch 一起更新（Notion 會吃掉一個）→ **要分兩次 PATCH**

### Notion DB04 status 欄位例外
- DB04 status 欄位：**發佈狀態**（status），與其他 DB 統一
- 其他 DB（DB05/06/07/08）都用「發佈狀態」
- 在 makesense-ink/sync 程式碼裡用 `statusFieldFor(table)` helper 取得正確欄位名

### DB05 三層 relation 注意事項（2026/05/06 雙層 → 2026/05/08 三層）

DB05 對 DB01-09 各有三條 relation：

| 對應X（直接上下游）| X引用（出向：本頁引用他人）| X被引（入向：本頁被他人引用）|
|---|---|---|
| 對應提案 | **提案引用** | **提案被引** |
| 對應管考 | **管考引用** | **管考被引** |
| 對應項目 | **項目引用** | **項目被引** |
| 對應協作 | **協作引用** | **協作被引** |
| 對應對象 | **對象引用** | **對象被引** |
| 對應地點 | （DB08 通用對象引用）| （DB08 通用對象被引）|
| 對應庫存 | **庫存引用** | **庫存被引** |
| 對應明細 | **明細引用** | **明細被引** |
| 對應日期 | **日期引用** | **日期被引** |
| —（自參考）| **內容引用** | **內容被引** |

**n8n workflow 寫 DB05 時的選擇規則**：
- 該 page **直接執行/輸出**到某 DB 項目 → 寫入 `對應X`
- 該 page **僅在內文引用提及他人** → 寫入 `X引用`
- 該 page **被他人引用** → **不需 workflow 寫入**（X被引 由 Notion dual-sync 自動鏡射，是 X引用 的反向；workflow 寫好 X引用 即可，X被引 自動完成）
- **同步到 Supabase 時只取 對應X**，X引用 + X被引 共 18 個 relation 純 Notion 內部，不參與 Supabase 同步、不進 partner_metrics_v 等聚合查詢
- 全文搜尋 / AI 找關聯 三條 relation 都看（找最廣）

---

## 四、Workflow 輸出格式規範

每次生成 workflow JSON 必須：

1. **驗證節點連線**：每個節點都要有進線或出線（Trigger 節點除外）
2. **驗證 Credential ID**：Notion 用 `PiXWlzhPKErr7TNX`
3. **驗證 Notion HTTP nodes**：bodyType 留空，rawContentType 填 `application/json`
4. **用 Python 驗證 JSON 結構**後再輸出

輸出格式：
```
/mnt/user-data/outputs/{workflow_name}_v{版本}.json
```

---

## 五、現有 Workflow 清單

用 `n8n:search_workflows` 取得最新清單。下列為已知關鍵 workflow：

### 現役（makesense.ink 同步用）
| 名稱 / Workflow ID | Webhook URL | 用途 | 狀態 |
|---|---|---|---|
| n8n daily sync (`C8Tc2zIoSW4THUr2`) | （cron 每天 8AM）| 全量 Notion → Supabase | 現役 |
| WF_DB04_Sync | `https://makesense.zeabur.app/webhook/sync-db04` | DB04 「發佈更新」按鈕 → events | 現役 |
| WF_DB05_Sync | `https://makesense.zeabur.app/webhook/sync-db05` | DB05 → articles（**忽略 9 個 X引用 + 9 個 X被引 共 18 個 relation**，只取對應X）| 現役 |
| WF_DB06_Sync | `https://makesense.zeabur.app/webhook/sync-db06` | DB06 → order_items（待完善）| 現役 |
| WF_DB07_Sync | `https://makesense.zeabur.app/webhook/sync-db07` | DB07 → products | 現役 |
| WF_DB08_Sync | `https://makesense.zeabur.app/webhook/sync-db08` | DB08 → persons/topics/partners/staff | 現役 |

每條 webhook 觸發 → 呼叫 makesense.ink `/api/sync/single?pageId=xxx&db=DBxx` → Supabase upsert。

### 待設計 / 規劃中
| 名稱 | 用途 | 狀態 |
|------|------|------|
| DB05 辨識分析 v1.0 | DB05 多格式辨識 → 分析備註（DB05 用四段格式）| 已設計，待 Import |
| DB05 知識點自動提煉 v1.0 | DB05 → 知識點建立 | 已設計，待 Import |
| 照片自動處理（Telegram + n8n 版）| 取代舊 Discord Python 流程 | 規劃中 |

### 已退役
| 名稱 | 退役原因 |
|------|---------|
| WF_POS_to_Notion | WP/WC 退役 |
| WF_WC_Order_to_Notion | WP/WC 退役 |
| WF_WC_Product_Events_to_Notion | WP/WC 退役 |

---

## 六、建立新 Workflow 的標準流程

**Step 1：確認需求**
不需要問的（已知）：Credential ID、系統架構
需要從 Notion 確認的：DB ID、業務規則、欄位名稱（**特別注意：Notion 真實欄位名為準，不要套用過時記憶**）
需要使用者確認的：觸發方式（Webhook/排程/手動）、成功/失敗後的行為

**Step 2：設計節點架構**
用文字先列出節點清單和連線邏輯，確認方向正確後再寫 JSON

**Step 3：生成 JSON**
套用第三節的所有規則，特別注意：
- Notion HTTP Request：bodyType 留空
- Code 節點多 item：runOnceForAllItems + index
- respondToWebhook：靜態字串
- DB04 status 欄位：發佈狀態（與其他 DB 統一）

**Step 4：驗證**
```bash
python3 -c "
import json
with open('output.json') as f:
    wf = json.load(f)
# 驗證節點數、連線數、Credential ID
"
```

**Step 5：輸出**
存到 `/mnt/user-data/outputs/` 並用 `present_files` 提供下載

---

## 七、分析備註 3-token 格式
分析備註（rich_text 欄位）統一 3-token 格式（2026/05/14 改版，四段式已廢棄）：

```
[類型]｜[執行時間]｜[關聯 DB]
```

- `[類型]`：依 2-2-2 欄位組合指南位階組合自拼
- `[執行時間]`：YYYY/MM/DD（一般）／YYYY/MM（月刊）／YYYY/Q1（季刊）
- `[關聯 DB]`：主要關聯 DB 編號（DB01~DB09）

**鐵律**：`分析備註` 與 `簡介摘要` 不能同一個 patch 一起更新，要分兩次。

---

## 八、多格式資料處理（辨識與提煉 Workflow 共用）

| 格式 | 處理方式 | 限制 |
|------|---------|------|
| PDF | `fetch()` 下載 → Base64 → Claude document | 最多 3 份 |
| JPG/PNG | `fetch()` 下載 → Base64 → Claude vision | 最多 5 張 |
| DOCX | `fetch()` 下載 → mammoth.js 提取文字 | 最多 2 份，15K 字元 |
| YouTube | 提取 video ID → 附加 URL 給 Claude | 無字幕，依上下文推測 |
| MP3/音訊 | 下載 → OpenAI Whisper → 文字 → Claude | 最大 25MB |
| 純文字 | 直接提取 Notion blocks 文字 | — |
