import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "makesense.ink 設計規格 / Design Spec",
  description: "makesense.ink 完整設計規格 — 給 AI / 設計師 / 工程師查找的單一入口。包含品牌、設計 tokens、頁面清單、元件、技術棧、修改提案格式。",
  robots: { index: true, follow: false },
};

export const dynamic = "force-static";

const COLORS = [
  { name: "ink", hex: "#1a1612", desc: "主要文字色（深咖啡黑）" },
  { name: "warm-white", hex: "#faf8f5", desc: "頁面底色（暖白）" },
  { name: "parchment", hex: "#f2ede6", desc: "卡片底、placeholder（米色）" },
  { name: "dust", hex: "#e8e0d4", desc: "邊框、分隔線" },
  { name: "bark", hex: "#8b7355", desc: "副文字、Footer 字色（樹皮棕）" },
  { name: "rust", hex: "#b5522a", desc: "售價、強調文字（鏽紅）" },
  { name: "teal", hex: "#4ECDC4", desc: "主要 CTA、品牌色（青）" },
  { name: "moss", hex: "#5c6b4a", desc: "次要強調（苔綠）" },
  { name: "mist", hex: "#9ba8a0", desc: "灰字、placeholder text" },
  { name: "gold", hex: "#b8943c", desc: "金色點綴" },
  { name: "sky", hex: "#3a5c78", desc: "藍色（少用）" },
  { name: "orange", hex: "#e8935a", desc: "暖橘（活動報名按鈕）" },
];

const FONTS = [
  { name: "Noto Sans TC", role: "內文（body / UI）", stack: `"Noto Sans TC", system-ui, sans-serif` },
  { name: "Noto Serif TC", role: "標題（headings）", stack: `"Noto Serif TC", Georgia, serif` },
  { name: "Playfair Display", role: "品牌字 makesense", stack: `"Playfair Display", serif` },
];

const PAGES = [
  { path: "/", purpose: "品牌首頁", layout: "Hero + 統計 + 雙品牌卡 + 近期活動 + 推薦", source: "Supabase events/products/articles", status: "✅ 上線" },
  { path: "/sense", purpose: "關於我們", layout: "Hero + Timeline + Impact + Capabilities", source: "lib/sense-data.ts（寫死）+ Supabase 計數", status: "✅ 編輯雜誌風" },
  { path: "/bookstore", purpose: "旅人書店", layout: "Hero 輪播 + 主題選書 + 風格選物 + 觀點漫遊地圖 + 地方通訊", source: "Supabase products/topics/articles", status: "✅ 含宜蘭地圖" },
  { path: "/cultureclub", purpose: "宜蘭文化俱樂部", layout: "Hero + 近期活動 + 地方通訊 + 話題觀點 + 選書選物 + 行事曆", source: "Supabase events/articles/topics", status: "✅" },
  { path: "/book-selection", purpose: "主題選書專頁", layout: "Hero carousel + 篩選 + grid", source: "Supabase products WHERE category='選書'", status: "✅" },
  { path: "/goods-selection", purpose: "風格選物專頁", layout: "Hero carousel + 篩選 + grid", source: "Supabase products WHERE category='選物'", status: "✅" },
  { path: "/market-booking", purpose: "展售合作", layout: "上半部編輯文 + 自有產品/合作品牌/市集活動", source: "Supabase products+partners+events", status: "✅" },
  { path: "/reading-tour", purpose: "走讀漫遊", layout: "編輯文 + 關鍵字 + 去過的地方", source: "Supabase topics+persons", status: "✅" },
  { path: "/space-experience", purpose: "空間體驗", layout: "編輯文 + 空間租借行事曆", source: "Supabase space_bookings", status: "✅" },
  { path: "/content-curation", purpose: "地方調研", layout: "編輯文 + 統計 + 採輯主題 + 關鍵字", source: "Supabase articles+topics+persons", status: "✅" },
  { path: "/local-newsletter", purpose: "地方通訊存檔", layout: "依日期排序文章列表", source: "Supabase articles", status: "✅" },
  { path: "/viewpoint-stroll", purpose: "文化觀點列表", layout: "Pills + grid", source: "Supabase topics(viewpoint)", status: "✅" },
  { path: "/viewpoint/[slug]", purpose: "單一觀點詳情", layout: "標題 + 摘要 + 關聯", source: "Supabase topics", status: "✅" },
  { path: "/product/[slug]", purpose: "商品詳情", layout: "圖庫 + 標題 + 價格 + 加購車 + 相關", source: "Supabase products", status: "✅" },
  { path: "/post/[slug]", purpose: "文章詳情", layout: "標題 + 封面 + 內文 HTML + 相關", source: "Supabase articles", status: "✅" },
  { path: "/events/[slug]", purpose: "活動詳情", layout: "封面 + 票券選擇 + 報名表單", source: "Supabase events", status: "✅" },
  { path: "/checkout", purpose: "結帳", layout: "聯絡資訊 + 取貨 + 付款 + 訂單摘要", source: "CartProvider + Supabase orders", status: "✅" },
  { path: "/checkout/success", purpose: "結帳完成", layout: "確認 + 訂單編號 + 訪客註冊 CTA", source: "API", status: "✅" },
  { path: "/login", purpose: "登入", layout: "Google + LINE OAuth", source: "NextAuth", status: "✅" },
  { path: "/dashboard", purpose: "會員中心", layout: "個人紀錄 / 工作台 / 合作後台 三角色", source: "Supabase members + Notion DB08 角色", status: "✅" },
  { path: "/dashboard/orders", purpose: "訂單紀錄", layout: "篩選 + 列表", source: "Supabase orders+order_items", status: "✅" },
  { path: "/dashboard/profile", purpose: "個人資料", layout: "表單 + 通知偏好", source: "Supabase members", status: "✅" },
  { path: "/dashboard/workbench", purpose: "工作台（staff）", layout: "5 tab：動態/交接/庫存/考勤/費用", source: "Notion API 直連", status: "✅" },
  { path: "/dashboard/partner", purpose: "合作後台（vendor）", layout: "5 tab：概覽/資訊/項目/金流/設定", source: "Supabase partners+products+reviews", status: "✅" },
  { path: "/market-apply/[slug]", purpose: "市集擺攤申請", layout: "5 區塊表單 + 5 類照片庫", source: "Supabase market_applications + vendor_photos", status: "✅ 新建" },
  { path: "/search?q=", purpose: "全站搜尋結果", layout: "4 類分區：商品/活動/文章/觀點", source: "Supabase ilike", status: "✅ 新建" },
];

const COMPONENTS = [
  { name: "Header", file: "components/ui/Header.tsx", what: "雙品牌 + 搜尋 + 語言 + 登入" },
  { name: "Footer", file: "components/ui/Footer.tsx", what: "5 連結 + 社群 + 電話地址 + makesense since 2012" },
  { name: "AddToCartButton", file: "components/ui/AddToCartButton.tsx", what: "+ 加入購物車（直接呼叫 cart context）" },
  { name: "QuickBookButton", file: "components/ui/QuickBookButton.tsx", what: "立即報名 → 跳到 events/[slug]#booking" },
  { name: "SafeImage", file: "components/ui/SafeImage.tsx", what: "圖片載入失敗 fallback 到 placeholder" },
  { name: "ImagePlaceholder", file: "components/ui/ImagePlaceholder.tsx", what: "品牌漸層 placeholder（7 種類型）" },
  { name: "Calendar", file: "components/calendar/Calendar.tsx", what: "行事曆（含國定假日 + 寒暑假）" },
  { name: "YilanMap", file: "components/viewpoint/YilanMap.tsx", what: "宜蘭地圖（編輯雜誌風 SVG）" },
  { name: "HeroCarousel", file: "components/ui/HeroCarousel.tsx", what: "首頁/書店 Hero 輪播" },
  { name: "BottomSheet", file: "components/ui/BottomSheet.tsx", what: "推薦商品/文章彈窗" },
];

export default function DesignSpecPage() {
  return (
    <div className="mx-auto px-6 py-10" style={{ maxWidth: 1100, fontFamily: "var(--font-sans)" }}>
      <header className="mb-10 pb-6" style={{ borderBottom: "1px solid var(--color-dust)" }}>
        <p className="text-xs tracking-[0.3em] mb-2" style={{ color: "var(--color-mist)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
          MAKESENSE.INK · DESIGN SPEC
        </p>
        <h1 className="text-3xl font-semibold mb-3" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}>
          makesense.ink 設計規格
        </h1>
        <p className="text-sm" style={{ color: "var(--color-bark)", lineHeight: 1.8 }}>
          這頁是給 AI（Claude / GPT / Notion AI）和設計師查找用的單一入口。
          想對 makesense.ink 提建議或產設計圖時，把這個 URL 給對方就好。
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs" style={{ color: "var(--color-mist)" }}>
          <a href="https://makesense.ink" className="hover:underline">🌐 makesense.ink</a>
          <a href="https://github.com/jay049Taiwan/makesense-ink" className="hover:underline">📦 GitHub</a>
          <a href="/api/design-spec" className="hover:underline">📄 純文字版（Markdown）</a>
        </div>
      </header>

      <Section title="0. 給 AI 的 Quick Prompt">
        <p className="text-sm mb-3" style={{ color: "var(--color-bark)" }}>把下面這段直接複製貼上給 Claude Design / GPT / 任何 AI：</p>
        <pre className="text-[12px] p-4 rounded overflow-x-auto" style={{ background: "var(--color-parchment)", color: "var(--color-ink)", lineHeight: 1.6 }}>
{`我官網是 makesense.ink — 宜蘭在地的文化品牌（旅人書店 + 宜蘭文化俱樂部）。
完整設計規格在這頁可以查：https://makesense.ink/design-spec
（或純文字版 https://makesense.ink/api/design-spec）

請先讀過上面那頁，了解品牌調性、設計 tokens、頁面結構，
然後針對 [我要改的部分] 給 [文字建議 / 視覺草圖 / code]。

要遵守的限制：
- 保留品牌色（teal #4ECDC4 / 棕 #8b7355 / 米 #faf8f5）
- 標題用 Noto Serif TC，內文用 Noto Sans TC
- 編輯雜誌感的調性（低彩度、留白、italic 點綴）
- 手機優先（mobile-first）`}
        </pre>
      </Section>

      <Section title="1. 品牌與調性">
        <Pair label="公司" value="現思文化創藝術有限公司（成立 2012）" />
        <Pair label="主理人" value="Noah（Jay049）— L5 執行長 / 共同創辦人" />
        <Pair label="位置" value="宜蘭縣羅東鎮文化街 55 號" />
        <Pair label="雙品牌" value="旅人書店（B2C 實體店 + 選書選物）／宜蘭文化俱樂部（B2B 文化策展 + 走讀）" />
        <Pair label="調性關鍵字" value="編輯雜誌、文化內容、低彩度、紙質感、留白、italic 點綴、地方溫度" />
        <Pair label="不要的方向" value="花俏 / 鮮豔色塊 / 卡通插畫 / 過度動畫 / 商業電商感" />
        <Pair label="字體哲學" value="標題 Serif（書本感）+ 內文 Sans（俐落）+ 英文點綴用 Playfair italic" />
        <Pair label="圖片風格" value="紀實照片優先、低飽和、自然光、人在地景中、避免擺拍" />
      </Section>

      <Section title="2. 設計 Tokens — 顏色">
        <p className="text-xs mb-4" style={{ color: "var(--color-mist)" }}>
          全部以 CSS 變數實現，定義在 <code>app/globals.css</code>。引用方式：<code>var(--color-name)</code>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLORS.map((c) => (
            <div key={c.name} className="rounded p-3" style={{ border: "1px solid var(--color-dust)", background: "#fff" }}>
              <div className="w-full h-12 rounded mb-2" style={{ background: c.hex, border: "1px solid rgba(0,0,0,0.06)" }} />
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--color-bark)" }}>
                --color-{c.name}
              </div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "var(--color-ink)" }}>{c.hex}</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--color-mist)", lineHeight: 1.4 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="3. 設計 Tokens — 字體">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-dust)", textAlign: "left" }}>
              <Th>字體</Th><Th>角色</Th><Th>Stack</Th>
            </tr>
          </thead>
          <tbody>
            {FONTS.map((f) => (
              <tr key={f.name} style={{ borderBottom: "1px dashed var(--color-dust)" }}>
                <Td><strong>{f.name}</strong></Td>
                <Td>{f.role}</Td>
                <Td><code style={{ fontSize: 11, color: "var(--color-bark)" }}>{f.stack}</code></Td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Pair label="頁面最大寬度" value="1200px" />
          <Pair label="文案內容寬度" value="1000px" />
          <Pair label="Section padding" value="48-72px (大區塊) / 24-32px (小區塊)" />
          <Pair label="Card 圓角" value="8px (lg) / 6px (md) / 4px (sm)" />
          <Pair label="Button 圓角" value="6px (預設) / 999px (pill)" />
          <Pair label="邊框" value="1px solid var(--color-dust)" />
          <Pair label="行距" value="1.7-1.9 (內文) / 1.3 (標題)" />
        </div>
      </Section>

      <Section title="4. 頁面清單">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-dust)" }}>
                <Th>路徑</Th><Th>用途</Th><Th>版型</Th><Th>資料來源</Th><Th>狀態</Th>
              </tr>
            </thead>
            <tbody>
              {PAGES.map((p) => (
                <tr key={p.path} style={{ borderBottom: "1px dashed var(--color-dust)" }}>
                  <Td><code>{p.path}</code></Td>
                  <Td>{p.purpose}</Td>
                  <Td style={{ fontSize: 11 }}>{p.layout}</Td>
                  <Td style={{ fontSize: 11, color: "var(--color-bark)" }}>{p.source}</Td>
                  <Td>{p.status}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="5. 主要元件">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-dust)" }}>
              <Th>元件</Th><Th>檔案</Th><Th>用途</Th>
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map((c) => (
              <tr key={c.name} style={{ borderBottom: "1px dashed var(--color-dust)" }}>
                <Td><strong>{c.name}</strong></Td>
                <Td><code style={{ fontSize: 11 }}>{c.file}</code></Td>
                <Td>{c.what}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="6. 技術棧 / 限制">
        <ul className="text-sm space-y-1.5" style={{ color: "var(--color-ink)", lineHeight: 1.8 }}>
          <li>• Framework: <strong>Next.js 16.2.3</strong>（App Router, Turbopack, RSC）</li>
          <li>• Style: <strong>Tailwind CSS 4</strong>（utility-first）+ inline styles for tokens</li>
          <li>• Language: <strong>TypeScript</strong></li>
          <li>• 多語言: <code>next-intl</code>（zh / en / ja / ko）</li>
          <li>• 認證: <code>next-auth</code>（Google + LINE OAuth）</li>
          <li>• 資料庫: <strong>Supabase (PostgreSQL)</strong> · 圖片 CDN: <strong>Cloudinary</strong></li>
          <li>• CMS: <strong>Notion</strong>（DB04~DB08，每筆按「發佈更新」→ n8n webhook → Supabase）</li>
          <li>• 部署: <strong>Vercel</strong>（自動 main → production）</li>
          <li>• 金流: <strong>到門市現場付現</strong>（線上金流尚未串接）</li>
        </ul>
        <p className="text-xs mt-4 p-3 rounded" style={{ background: "var(--color-parchment)", color: "var(--color-bark)", lineHeight: 1.7 }}>
          ⚠️ <strong>建議 AI 給的 code 要</strong>：用 CSS 變數而非寫死顏色 / 用 Server Component 為預設 / 避免 client-side fetching 用 server-side / TypeScript 嚴格 / mobile-first（手機 ≦ 640px 是優先級）。
        </p>
      </Section>

      <Section title="7. 怎麼向 AI 描述「我要改的部分」">
        <p className="text-sm mb-3" style={{ color: "var(--color-bark)" }}>套用以下格式，AI 比較不會放飛：</p>
        <pre className="text-[12px] p-4 rounded overflow-x-auto" style={{ background: "var(--color-parchment)", color: "var(--color-ink)", lineHeight: 1.7 }}>
{`【目標頁面】 例：/cultureclub
【現況問題】 例：Hero 太空、缺溫度
【希望改成】 例：放一張紀實照片 + 一句品牌主張，數字往下移
【限制】 例：保留行事曆、不要動 Footer
【交付物】 例：給我 3 個視覺方向草圖 / 給我可貼回 makesense.ink 的 React JSX

請先讀過 https://makesense.ink/design-spec 再動手。`}
        </pre>
      </Section>

      <footer className="mt-12 pt-6 text-xs" style={{ color: "var(--color-mist)", borderTop: "1px solid var(--color-dust)", lineHeight: 1.7 }}>
        <p>
          這頁定期會跟著 makesense.ink 程式碼更新。如果你（AI）發現上面資訊跟線上版不符，
          可優先信任線上版本（直接到 <a href="https://makesense.ink" className="underline">makesense.ink</a> 看）。
        </p>
        <p className="mt-2">
          想看 markdown 純文字版（適合餵給 GPT 等不擅長解析 HTML 的 AI）：
          {" "}<a href="/api/design-spec" className="underline">/api/design-spec</a>
        </p>
        <p className="mt-3">
          <Link href="/" style={{ color: "var(--color-teal)" }}>← 回 makesense.ink 首頁</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)", borderLeft: "3px solid var(--color-teal)", paddingLeft: 12 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5" style={{ borderBottom: "1px dashed var(--color-dust)" }}>
      <span className="text-sm" style={{ color: "var(--color-bark)", minWidth: 110 }}>{label}</span>
      <span className="text-sm flex-1" style={{ color: "var(--color-ink)" }}>{value}</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-2 text-left text-xs font-semibold" style={{ color: "var(--color-bark)" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td className="py-2 px-2 align-top" style={style}>{children}</td>;
}
