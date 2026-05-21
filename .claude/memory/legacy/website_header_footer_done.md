---
name: Header/Footer 統一完成
description: 2026-04-08 完成官網 Header/Footer 跨子網域統一，SP-HDR1 v1.7.0 + SP-UI1v8
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
> ⚠️ **[LEGACY]** WP 舊站 makesense.site 已於 2026/04 退役，本文件僅供歷史參考。

## 完成項目（2026-04-08）

**SP-HDR1 v1.7.0**（id=128, scope=global, active=1）
- 統管所有 header CSS + JS + booking redirect
- 外層容器 966b509 鎖定 1140px 置中
- 手機版 RWD（≤767px）：文字 16px、搜尋列+登入按鈕第二排
- JS 保底路徑：ae64aaf 不存在時動態插入宜蘭文化俱樂部連結
- 包含 booking redirect（原 MS-NAV-FIX 功能）

**SP-UI1v8**（footer）
- 淺色單列版 footer
- © 2012–動態年份 現思文化創藝術有限公司
- 手機版置中排列、分隔線隱藏

**已刪除/停用**
- SP-UI1（原版 header+footer）→ 已刪除
- MS-NAV-FIX → 已從資料庫刪除（id=124）
- Elementor Header 模板 (ID:310) 的自訂 CSS → 已清空
- 附加 CSS 的 header 規則 → 已清除

**Why:** 原本 header CSS 散落在 4+ 個來源互相覆蓋（!important 戰爭），跨子網域顯示不一致。
**How to apply:** 以後改 header 只需改 SP-HDR1 一個地方。改 footer 只需改 SP-UI1v8。

## 注意事項
- Code Snippets 在此 multisite 是**共用一個 wp_snippets 表**，scope=global 的 snippet 對所有子站生效
- cultureclub 子站的 LiteSpeed Cache 曾被關閉再開啟，如果 header 又亂跳，先清 cultureclub 的 LiteSpeed Cache Toolbox → Empty Entire Cache
- SSH 帳號 shell 是 nologin（Hostinger 共享主機限制），只能用 phpMyAdmin 改資料庫
