# 工作台 × Telegram Bot 同步整合 — 交接文件

## 進度狀態（2026/04/24 更新）

### ✅ 已完成：UI 同步（兩個入口共用同一個 React 組件）
- **共用組件**：`components/workbench/WorkbenchShell.tsx`（檔頭已加鐵律註解）
- **官網入口**：`app/[locale]/dashboard/workbench/page.tsx`（NextAuth + staff 角色）
- **Telegram 入口**：`app/telegram/workbench/page.tsx`（Telegram WebApp + member_type=staff）
- **Telegram auth API**：`app/api/telegram/auth/route.ts`（HMAC 驗 initData → 查 Supabase）
- **LayoutShell**：`/telegram/*` 路徑自動隱藏 Header/Footer
- **保險機制**：兩個 page.tsx 均加註解「改 UI 請改 WorkbenchShell.tsx」+ CLAUDE.md「鐵律」章節

### 🚧 待做：資料層同步（Notion ↔ Telegram Bot 雙向）
下面第二部分起的內容（Telegram Bot 指令 ↔ Notion API ↔ 官網工作台的資料流）尚未實作。

---

## 目標
讓「工作團隊」角色的會員，在 **官網工作台（/dashboard/workbench）** 和 **Telegram Bot（Tagwin）** 之間雙向同步。

---

## 一、官網工作台現況

### 位置
- **路徑**: `/dashboard/workbench`
- **檔案**: `makesense-ink/app/dashboard/workbench/page.tsx`
- **框架**: Next.js 16 + TypeScript + Tailwind CSS 4
- **角色限制**: 只有 `role === "staff"` 才看得到工作台分頁

### 五個功能 Tab（底部 Tab Bar）

| Tab | 圖示 | 功能說明 | 對應 Notion DB |
|-----|------|---------|---------------|
| **動態** | 📢 | 庫存異動通知、系統公告 | DB07 庫存資產 |
| **交接** | 📋 | 待辦事項列表，左欄 DB03 工作項目、右欄 DB06 進銷明細子任務 | DB03 + DB06 |
| **庫存** | 📦 | 商品庫存數量管理（目前 mock） | DB07 庫存資產 |
| **考勤** | ⏰ | 打卡、出勤記錄（目前 mock） | DB05 登記表單明細 |
| **費用** | 💰 | 費用申報、報帳（目前 mock） | DB06 進銷明細 |

### 工作台 UI 結構
```
┌─────────────────────────────────┐
│ 問候列（深色背景）               │
│ 顯示：姓名、Email、LINE 綁定狀態 │
├─────────────────────────────────┤
│ [會員中心] [工作台]  ← 頁面分頁   │
├─────────────────────────────────┤
│                                 │
│ 主內容區（依底部 Tab 切換）       │
│                                 │
├─────────────────────────────────┤
│ [📢動態][📋交接][📦庫存][⏰考勤][💰費用] │
│ ← 底部固定 Tab Bar               │
└─────────────────────────────────┘
```

### 交接 Tab 細節（最複雜的）
- **左欄**：DB03 工作項目列表，分「未完成」和「已完成」
- **右欄**：選中項目的詳情 + DB06 子任務 checklist
- 子任務全部勾完 → 主任務自動標記完成
- 每個任務有：title、person（負責人）、date（執行時間）、note（備註）

---

## 二、Telegram Bot（Tagwin）現況

### 基本資訊
- **Bot 名稱**: makesense（Tagwin）
- **平台**: Telegram
- **使用者 ID**: Jay049（ID: 8523155253）

### 目前支援的指令
| 指令 | 功能 |
|------|------|
| `/start` | 啟動 Bot |
| `/today` | 查看今天要做的事 |
| `/done 內容` | 回報完成一件事 |
| `/log 內容` | 記錄工作內容 |
| `/ask 問題` | 問工作相關問題 |
| `/help` | 查看使用說明 |

### 需要同步的行為
Telegram Bot 的操作應該反映到官網工作台，反之亦然：

| Telegram 操作 | 對應官網工作台 | 資料流向 |
|--------------|-------------|---------|
| `/today` | 交接 Tab → 顯示今天的未完成項目 | Notion → Telegram |
| `/done` | 交接 Tab → 勾完子任務 / 標記完成 | Telegram → Notion → 官網 |
| `/log` | 動態 Tab → 新增一筆工作記錄 | Telegram → Notion → 官網 |
| 官網勾完子任務 | Bot 可查詢到更新後的狀態 | 官網 → Notion → Telegram |

---

## 三、Notion 資料庫 ID 對照

| DB | 名稱 | Page ID | Collection ID |
|----|------|---------|---------------|
| DB01 | 資源提案 | `e2d16f2a01814d9f8adce25ed61e633c` | `722f2478-7e61-4b4b-ad1c-d171b4a639db` |
| DB02 | 績效管考 | `df3aea7e12d24d268ee1d3cdcdf8e0a5` | `c286e19b-9cf8-422b-8628-98b6d116040c` |
| DB03 | 工作項目進度 | `8380024499b347f0aad4ecdf0e4d8d1d` | `968b23ea-da1f-4381-bd9a-253ee80b0656` |
| DB04 | 共識交接協作 | `99808f9cd0ab4c21bc684d8836150207` | `5ad63416-a7c5-4d84-812e-cddf56c8bc01` |
| DB05 | 登記表單明細 | `e5f14f056c7c4b8a804304eab598fd4d` | `28a667a9-ede1-466a-9f18-419da33a8810` |
| DB06 | 進銷明細 | `3469ff25fdab83c98ff98107ee6a6a1c` | `a809ff25-fdab-8236-b491-87496d236ac9` |
| DB07 | 庫存資產 | `1a7e3684754d47bcb335cf5b795454ac` | `0f5a87d4-d1df-4271-ba00-2abfee01693d` |
| DB08 | 關係經營 | `873970187f394f6b8304406745bd1579` | `6934a808-b79b-4446-98dd-f699476408a0` |
| DB09 | 範圍日期 | `b10ed6ed4afc48d58539790da89b2e08` | `6547375e-ff14-4f24-ab0f-9f2a223a8580` |

### DB05 重要欄位（2026/04/18 校正）
- **表單名稱**（title）← DB05 title 是「表單名稱」（「明細名稱」是 DB06 的 title）
- **明細內容**（rich_text）
- **表單類型**（select）— 只有 3 選項：報名登記、共識互動、圖文影音（DB05 無「明細類型」）
- **對應對象**（relation → DB08）← DB05 連結 DB08 用「對應對象」（「對應標籤對象」已搬到 DB06）

---

## 四、技術架構建議

### 資料流
```
Telegram Bot ←→ Notion API ←→ Next.js API Routes ←→ 官網前端
```

### 官網 API 端點（待建）
- `GET /api/workbench/tasks` — 取得工作項目列表
- `PATCH /api/workbench/tasks/:id` — 更新任務狀態
- `POST /api/workbench/log` — 新增工作記錄
- `GET /api/workbench/inventory` — 取得庫存異動

### Telegram Bot 需要的能力
1. 查詢 Notion DB03 取得今日待辦
2. 更新 Notion DB06 子任務完成狀態
3. 寫入 Notion DB05 工作記錄
4. 推送通知（庫存異動等）

### 身份識別
- Telegram User ID 需對應 Notion DB08 的團隊成員記錄
- 官網用 NextAuth session 判斷 role === "staff"
- 兩者透過 Notion DB08 的成員資料連結

---

## 五、目前狀態

- 官網工作台：UI 已建好，目前全部用 **mock data**，尚未接 Notion API
- Telegram Bot：已部署，支援基本指令，尚未接 Notion API
- 兩者的同步邏輯：**尚未實作**，這是接下來要做的事

## 六、功能開關同步機制

官網工作台和 Telegram Bot 需要共用一份「功能開關設定」，讓 Noah 可以在 Notion 統一控制哪些功能啟用/關閉，兩邊同步生效。

### 建議做法：Notion 設定頁面
在 Notion 建立一個設定頁面（或簡易 DB），定義工作台功能開關：

| 功能 key | 顯示名稱 | 開啟 | Telegram 指令 |
|---------|---------|------|--------------|
| activity_feed | 動態 | ✅ | — |
| handover | 交接 | ✅ | /today, /done |
| inventory | 庫存 | ✅ | — |
| attendance | 考勤 | ✅ | — |
| expense | 費用 | ✅ | — |

### 兩邊的讀取邏輯
- **官網**：API route `GET /api/workbench/config` → 讀取 Notion 設定 → 前端據此顯示/隱藏 Tab
- **Telegram Bot**：啟動時或收到指令時 → 讀取同一份 Notion 設定 → 決定是否回應該指令

### 效果
Noah 在 Notion 把「考勤」關掉 → 官網工作台的考勤 Tab 消失 + Telegram 相關指令停用，不需要改任何程式碼。

---

## 七、優先順序建議

1. 先讓 Telegram `/today` 能從 Notion DB03 拉真實資料
2. 讓 `/done` 能更新 Notion 任務狀態
3. 官網工作台接 Notion API（取代 mock data）
4. 雙向即時同步（webhook 或輪詢）
