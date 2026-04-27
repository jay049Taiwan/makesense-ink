import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600;

const SPEC = `# makesense.ink Design Spec

> 給 AI / 設計師 / 工程師查找用的單一規格入口。
> 完整 HTML 版：https://makesense.ink/_spec-mks-cd5e45b5
> Live site：https://makesense.ink
> GitHub：https://github.com/jay049Taiwan/makesense-ink

## 0. Quick Prompt（複製貼給 AI）

\`\`\`
我官網是 makesense.ink — 宜蘭在地的文化品牌（旅人書店 + 宜蘭文化俱樂部）。
完整設計規格在 https://makesense.ink/_spec-mks-cd5e45b5
請先讀過上面那頁，了解品牌調性、設計 tokens、頁面結構，
然後針對 [我要改的部分] 給 [文字建議 / 視覺草圖 / code]。

要遵守的限制：
- 保留品牌色（teal #4ECDC4 / 棕 #8b7355 / 米 #faf8f5）
- 標題用 Noto Serif TC，內文用 Noto Sans TC
- 編輯雜誌感的調性（低彩度、留白、italic 點綴）
- 手機優先（mobile-first）
\`\`\`

## 1. 品牌與調性

- 公司：現思文化創藝術有限公司（成立 2012）
- 主理人：Noah（Jay049）— L5 執行長 / 共同創辦人
- 位置：宜蘭縣羅東鎮文化街 55 號
- 雙品牌：
  - 旅人書店（B2C 實體店 + 選書選物）
  - 宜蘭文化俱樂部（B2B 文化策展 + 走讀）
- 調性關鍵字：編輯雜誌、文化內容、低彩度、紙質感、留白、italic 點綴、地方溫度
- 不要的方向：花俏 / 鮮豔色塊 / 卡通插畫 / 過度動畫 / 商業電商感
- 字體哲學：標題 Serif（書本感）+ 內文 Sans（俐落）+ 英文點綴用 Playfair italic
- 圖片風格：紀實照片優先、低飽和、自然光、人在地景中、避免擺拍

## 2. 設計 Tokens — 顏色

CSS 變數定義在 \`app/globals.css\`。引用：\`var(--color-name)\`

| Token | Hex | 用途 |
|-------|-----|------|
| --color-ink | #1a1612 | 主要文字色（深咖啡黑） |
| --color-warm-white | #faf8f5 | 頁面底色（暖白） |
| --color-parchment | #f2ede6 | 卡片底、placeholder（米色） |
| --color-dust | #e8e0d4 | 邊框、分隔線 |
| --color-bark | #8b7355 | 副文字、Footer 字色（樹皮棕） |
| --color-rust | #b5522a | 售價、強調文字（鏽紅） |
| --color-teal | #4ECDC4 | 主要 CTA、品牌色（青） |
| --color-moss | #5c6b4a | 次要強調（苔綠） |
| --color-mist | #9ba8a0 | 灰字、placeholder text |
| --color-gold | #b8943c | 金色點綴 |
| --color-sky | #3a5c78 | 藍色（少用） |
| --color-orange | #e8935a | 暖橘（活動報名按鈕、強調） |

## 3. 設計 Tokens — 字體

| 字體 | 角色 | Stack |
|------|------|-------|
| Noto Sans TC | 內文 / UI | "Noto Sans TC", system-ui, sans-serif |
| Noto Serif TC | 標題 | "Noto Serif TC", Georgia, serif |
| Playfair Display | 品牌字 makesense | "Playfair Display", serif |

## 4. 設計 Tokens — 版面

- 頁面最大寬度：1200px
- 文案內容寬度：1000px
- Section padding：48-72px（大區塊）/ 24-32px（小區塊）
- Card 圓角：8px (lg) / 6px (md) / 4px (sm)
- Button 圓角：6px（預設）/ 999px（pill）
- 邊框：1px solid var(--color-dust)
- 行距：1.7-1.9（內文）/ 1.3（標題）

## 5. 頁面清單

| 路徑 | 用途 | 資料來源 |
|------|------|---------|
| / | 品牌首頁（Hero + 統計 + 雙品牌 + 近期活動）| Supabase events/products/articles |
| /sense | 關於我們（Timeline + Impact + Capabilities）| lib/sense-data.ts + Supabase 計數 |
| /bookstore | 旅人書店（含宜蘭觀點地圖）| Supabase products/topics/articles |
| /cultureclub | 宜蘭文化俱樂部（活動 / 通訊 / 觀點 / 行事曆）| Supabase events/articles/topics |
| /book-selection | 主題選書專頁 | Supabase products WHERE category='選書' |
| /goods-selection | 風格選物專頁 | Supabase products WHERE category='選物' |
| /market-booking | 展售合作（自有產品 / 合作品牌 / 市集活動）| Supabase products+partners+events |
| /reading-tour | 走讀漫遊 | Supabase topics+persons |
| /space-experience | 空間體驗 + 租借行事曆 | Supabase space_bookings |
| /content-curation | 地方調研 | Supabase articles+topics+persons |
| /local-newsletter | 地方通訊存檔 | Supabase articles |
| /viewpoint-stroll | 文化觀點列表 | Supabase topics(viewpoint) |
| /viewpoint/[slug] | 觀點詳情 | Supabase topics |
| /product/[slug] | 商品詳情 | Supabase products |
| /post/[slug] | 文章詳情 | Supabase articles |
| /events/[slug] | 活動詳情 + 報名表 | Supabase events |
| /checkout | 結帳 | CartProvider + Supabase orders |
| /checkout/success | 結帳完成 + 訪客註冊 CTA | API |
| /search?q= | 全站搜尋（4 類分區）| Supabase ilike |
| /login | 登入（Google + LINE OAuth）| NextAuth |
| /dashboard | 會員中心（個人/工作台/合作後台 三角色）| Supabase + Notion DB08 |
| /dashboard/orders | 訂單紀錄 | Supabase orders |
| /dashboard/profile | 個人資料 | Supabase members |
| /dashboard/workbench | 工作台（staff）| Notion API 直連 |
| /dashboard/partner | 合作後台（vendor）| Supabase partners+products |
| /market-apply/[slug] | 市集擺攤申請（含照片庫）| Supabase market_applications + vendor_photos |

## 6. 主要元件

| 元件 | 檔案 | 用途 |
|------|------|------|
| Header | components/ui/Header.tsx | 雙品牌 + 搜尋 + 語言 + 登入 |
| Footer | components/ui/Footer.tsx | 5 連結 + 社群 + 電話地址 + makesense since 2012 |
| AddToCartButton | components/ui/AddToCartButton.tsx | + 加入購物車（直接呼叫 cart context） |
| QuickBookButton | components/ui/QuickBookButton.tsx | 立即報名 → 跳到 events/[slug]#booking |
| SafeImage | components/ui/SafeImage.tsx | 圖片載入失敗 fallback |
| ImagePlaceholder | components/ui/ImagePlaceholder.tsx | 品牌漸層 placeholder |
| Calendar | components/calendar/Calendar.tsx | 行事曆（含國定假日 + 寒暑假）|
| YilanMap | components/viewpoint/YilanMap.tsx | 宜蘭地圖（編輯雜誌風 SVG）|
| HeroCarousel | components/ui/HeroCarousel.tsx | 首頁/書店 Hero 輪播 |
| BottomSheet | components/ui/BottomSheet.tsx | 推薦商品/文章彈窗 |

## 7. 技術棧

- Framework：Next.js 16.2.3（App Router, Turbopack, RSC）
- Style：Tailwind CSS 4 + inline styles for tokens
- Language：TypeScript
- 多語言：next-intl（zh / en / ja / ko）
- 認證：next-auth（Google + LINE OAuth）
- 資料庫：Supabase (PostgreSQL)
- 圖片 CDN：Cloudinary
- CMS：Notion（DB04~DB08，每筆按「發佈更新」→ n8n webhook → Supabase）
- 部署：Vercel（自動 main → production）
- 金流：到門市現場付現（線上金流尚未串接）

## 8. AI 給的 code 要遵守

- 用 CSS 變數而非寫死顏色（var(--color-name)）
- Server Component 為預設，client 才用 "use client"
- TypeScript 嚴格、不要 \`any\`
- mobile-first（手機 ≦ 640px 是優先級）
- 標題用 Noto Serif TC，內文用 Noto Sans TC

## 9. 怎麼描述「我要改的部分」

\`\`\`
【目標頁面】 例：/cultureclub
【現況問題】 例：Hero 太空、缺溫度
【希望改成】 例：放一張紀實照片 + 一句品牌主張，數字往下移
【限制】 例：保留行事曆、不要動 Footer
【交付物】 例：給我 3 個視覺方向草圖 / 給我可貼回 makesense.ink 的 React JSX

請先讀過 https://makesense.ink/_spec-mks-cd5e45b5 再動手。
\`\`\`

## 10. Notion 資料庫對應

| DB | Notion 名稱 | Supabase |
|----|------------|----------|
| DB04 | 共識交接協作 | events, space_bookings |
| DB05 | 登記表單明細 | articles（文案細項=官網內容）, registrations |
| DB06 | 進銷明細 | 更新 products.stock |
| DB07 | 庫存資產 | products |
| DB08 | 關係經營 | persons / partners / topics / staff / members |

每筆 Notion 頁面有「發佈更新」按鈕 → n8n webhook → /api/sync/single → Supabase upsert + 回寫 Notion 對應連結。

## 11. 已知限制與待辦

- 內容上架率低：topics 0/628、partners 0/1340、articles 17/1764、events 27/732、products 35/5324
- events 27/27 全缺封面圖；articles 17/17 全缺封面圖
- 線上金流未接（只能門市付現）
- 簽到 UI 未做（Supabase 有 checkin_status 欄位但前端無按鈕）

---

最後更新：跟 git main 同步。如有不符，以線上 https://makesense.ink 為準。
`;

export async function GET() {
  return new NextResponse(SPEC, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
