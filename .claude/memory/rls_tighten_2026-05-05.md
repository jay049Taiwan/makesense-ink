---
type: project
date: 2026-05-05
topic: Supabase RLS 收緊（高風險表）
project: makesense-ink
originSessionId: a7d43a70-af42-47c9-9677-a6a2e1de0f31
---
# Supabase RLS 收緊紀錄（2026-05-05）

對 7 張高風險表（members, orders, order_items, registrations, encore_requests, page_views, search_logs）逐一驗證前端使用情境，安全的就 drop anon policy。

## 收緊前 policy 狀況

| 表 | 既有 policy（public/anon） |
|---|---|
| members | SELECT (Allow public select members) |
| orders | SELECT (Allow public select orders) |
| order_items | SELECT (Allow public select order_items) |
| registrations | 無（只有 service_role ALL） |
| encore_requests | INSERT + SELECT |
| page_views | INSERT + SELECT |
| search_logs | INSERT + SELECT |

## 程式碼引用稽核（路徑：/Users/jay049/Code/makesense-ink/）

### A 類（全部走 supabaseAdmin，可安全 drop 所有 anon policy）

**members** — 38 處 .from("members")，全部來自以下檔案，import 均為 `supabaseAdmin` 或 `supabaseAdmin as supabase`：
- app/[locale]/post/[slug]/page.tsx, app/[locale]/market-apply/[slug]/page.tsx
- app/api/booking/market, app/api/checkout, app/api/market-apply, app/api/orders, app/api/points, app/api/buy/preorder, app/api/partner/qr-scan, app/api/sync/single, app/api/staff/_guard, app/api/vendor-photos, app/api/analytics
- app/api/user/* (profile, vendor-profile, partner-applications, last-registration, link-line/callback)
- app/api/line/* (event-followup, cart-recovery)
- app/api/telegram/* (auth, bind), app/api/liff/* (auth, bind, me/orders)
- lib/auth.ts, lib/line-notifications.ts

**orders** — 同樣全部 supabaseAdmin（checkout, line-pay/confirm, partner/qr-scan, line-*, sync/single, orders/*, analytics, liff/me/orders, lib/admission-notify, lib/line-notifications, app/[locale]/post/[slug]/page.tsx [aliased as supabase 但其實是 admin]）。

**order_items** — 同樣全部 supabaseAdmin（checkout, partner/qr-scan, line/event-followup, points, staff/tasks, sync/single, lib/admission-notify, lib/line-notifications）。

**registrations** — 引用：app/api/checkout, app/api/user/last-registration, lib/admission-notify。全部 supabaseAdmin。本來就沒 public policy，無事可做。

### B 類（保留 INSERT，drop SELECT）

**page_views** — anon INSERT 來自 lib/tracking.ts:47（明確標註「Uses anon key since these are client-side calls」）。SELECT 只在 app/api/analytics/route.ts:20,25 使用，但該檔案已 import supabaseAdmin。→ 可 drop SELECT。

**search_logs** — anon INSERT 來自 lib/tracking.ts:68。另一個 INSERT app/api/search-index/route.ts:48 是 anon `supabase`（一致行為）。SELECT 只在 app/api/analytics（supabaseAdmin）。→ 可 drop SELECT。

### C 類（不動，需要先改程式才能 drop）

**encore_requests** — app/[locale]/events/[slug]/page.tsx 是 client component，import `supabase`（anon）：
- line 555-559：anon SELECT count（顯示「敲碗人數」）
- line 581：anon INSERT（送出敲碗表單）

**現狀已是「INSERT + SELECT」雙開放，drop SELECT 會破壞前端顯示敲碗人數。**

修法建議（下次處理）：
1. 把敲碗人數改成走 server-side API（例如 `/api/events/[slug]/encore-count`，server 用 supabaseAdmin），客戶端只 POST 表單。
2. 或加 RLS 改為「只能 SELECT count，不能讀整列 PII」——但 PostgREST/RLS 沒有純 count-only 模式，比較難做乾淨。
3. 改完後即可 drop `encore_public_read`，保留 `encore_public_insert`。

⚠️ 注意：encore_requests 包含 name/email/phone，目前 anon 可全表讀取，**屬於 PII 外洩風險**，建議盡快修。

## 已執行 DROP（2026-05-05）

```sql
-- A 類
DROP POLICY "Allow public select members" ON public.members;
DROP POLICY "Allow public select orders" ON public.orders;
DROP POLICY "Allow public select order_items" ON public.order_items;

-- B 類
DROP POLICY "Allow anonymous select page_views" ON public.page_views;
DROP POLICY "Allow anonymous select search_logs" ON public.search_logs;
```

Migration name：`tighten_rls_anon_2026_05_05`

## 收緊後 policy 狀況

| 表 | 剩下的 public policy |
|---|---|
| members | 無（service_role 走 bypass） |
| orders | 無 |
| order_items | 無 |
| registrations | 無（原本就是只有 service_role） |
| encore_requests | INSERT + SELECT（**未動，C 類**） |
| page_views | INSERT only |
| search_logs | INSERT only |

## 下次待辦

1. encore_requests：把 events 頁敲碗人數讀取改走 server API（用 supabaseAdmin），改完後 drop `encore_public_read`。
2. 其他次高風險表（reviews / wishlist / vendor_photos / market_applications / partner_applications）可再來一輪。
