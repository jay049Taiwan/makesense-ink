---
name: Snippet 全站健檢計畫
description: 2026-04-09 確認需要逐一檢查所有 snippet，避免依賴衝突、快取問題、破版
type: project
originSessionId: 14e10511-7fa1-40db-9bae-87321b80a0e9
---
> ⚠️ **[LEGACY]** 本計畫針對 WP 舊站 makesense.site，舊站已於 2026/04 退役，全站健檢不再執行。

## 背景
2026-04-09 花了一整天處理俱樂部首頁破版、行事曆不顯示、LiteSpeed 快取衝突等問題。
根本原因：snippet 之間依賴不清楚、CSS 分離輸出被快取系統移除、Code Snippets API 不可靠。

## 已完成的改善（2026-04-09）
1. **CC-S3**（cc_latest_events + cc_latest_products）改為自包架構 — CSS+HTML+JS 在 shortcode 內
2. **CC-S5**（cc_curation）改為自包架構 — CSS 在 shortcode 內
3. **EY-CAL**（行事曆）改為 PHP 伺服器端渲染，不依賴 JS
4. **SP-BK1v4**（展售合作行事曆）改為 PHP 伺服器端渲染
5. **EY-MAP**（宜蘭地圖）D3 CDN 改為直接 echo script tag
6. **LiteSpeed CSS 優化**全部關閉（CCSS/UCSS/CSS Combine/Async Load）
7. **today_in_history** 從 Elementor page 43 移除

## 待做：全站 Snippet 健檢
逐一檢查每個 active snippet：
- [ ] CSS 是否自包（在 shortcode 內輸出，不是 wp_head 分離）
- [ ] JS 是否自包（在 shortcode 內輸出，不是 wp_footer 分離）
- [ ] 有沒有跟其他 snippet 的 CSS class name 衝突
- [ ] 有沒有重複的 shortcode 註冊
- [ ] scope 是否正確（global vs front-end）
- [ ] 有沒有殘留的停用副本需要清理
- [ ] Code Snippets API 建立的 snippet 是否確實 active

## 已知問題
- Code Snippets REST API 的 PUT 不持久，必須 DELETE + POST
- Code Snippets API DELETE 有時 500（舊 ID 刪不掉）
- 停用 snippet 後，shortcode 可能仍然被執行（原因不明，可能是 object cache）
- LiteSpeed Cache 即使 Empty Entire Cache 也可能殘留舊版
- Hostinger hCDN 有自己的快取層

## 當前 active snippets 清單（待下次 session 拉取最新）
需要用 API 拉取完整清單，逐一檢查

**Why:** 避免再花整天時間救火
**How to apply:** 下次 session 開始時，先拉 active snippet 清單，逐一檢查架構
