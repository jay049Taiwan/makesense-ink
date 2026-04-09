# makesense.ink — 現思文化創藝術官網

## 專案概述
Next.js 16 + Tailwind CSS + TypeScript 商業網站，部署在 Vercel，CMS 用 Notion API。

## 技術棧
- Next.js 16 (App Router)
- Tailwind CSS 4
- TypeScript
- @notionhq/client (Notion SDK)
- next-auth (會員系統)
- 部署：Vercel
- 金流：綠界 ECPay（待串接）

## 網站結構
```
/                      → 品牌首頁
/bookstore             → 旅人書店
/bookstore/market-booking → 展售合作（市集報名）
/bookstore/space-booking  → 空間體驗（場地預約）
/cultureclub           → 宜蘭文化俱樂部
/dashboard             → 會員中心
/dashboard/profile     → 個人資料
/dashboard/orders      → 訂單紀錄
/dashboard/yilan-map   → 我的宜蘭（互動地圖）
/dashboard/volunteer   → 志工服務
/api/booking/market    → 市集報名 API
/api/booking/space     → 空間預約 API
/api/webhook           → n8n webhook 接口
```

## Notion 資料庫 ID
見 .env.local，DB01~DB09 對應現思的九個資料庫。

## 設計規範
- 品牌色：棕 #7a5c40、棕褐 #b89e7a、米 #faf8f4、青 #4ECDC4、橘 #e8935a
- 字體：Noto Sans TC（內文）、Noto Serif TC（標題）
- 最大寬度：1140px
- 行事曆：940px、週一起始、格高 90px

## 開發指令
```bash
npm run dev    # 本地開發
npm run build  # 建置
npm run start  # 生產模式
npm run lint   # ESLint
```
