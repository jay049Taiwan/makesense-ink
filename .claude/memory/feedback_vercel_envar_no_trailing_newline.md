---
name: Vercel envar 設定避免 trailing newline
description: 設定 Vercel 環境變數時用 echo -n + pipe，不要直接 paste，避免 \n 卡在結尾造成 HTTP header 認證 401
type: feedback
originSessionId: a88c34a9-2a16-45ad-a65c-56a4f64b4f90
---
設 Vercel envar 一律用 `echo -n "VALUE" | vercel env add VAR_NAME production`，不要直接在 Vercel UI 或 CLI 互動模式 paste 值。

**Why:** 2026/05/04 makesense.ink 工作台動態 tab 載入慢的根因 — Vercel `CRON_SECRET` 結尾被 paste 帶到一個 literal `\n`（兩個 ASCII 字元，反斜線+n）。HTTP header 不能含換行，所以 n8n cron 帶任何形式的 token 都被認證為 401。症狀只有「workbench_notifications 沒新資料」，沒人會直覺想到是 envar 結尾髒掉。debug 花了一整輪 session 才找到。

**How to apply:**
- 每次 `vercel env add` 一律 pipe：`echo -n "value-here" | vercel env add VAR_NAME production`
- `-n` 是關鍵（不加會帶換行符）
- 改完後 redeploy 才會生效
- 任何 auth-protected 端點（cron、webhook、internal API）出現 401，第一個排查方向就是「envar 結尾乾不乾淨」，比後端 code 還早查
- 驗證方法：`vercel env pull .env.production` 後 `cat -A .env.production | grep VAR_NAME`，看尾巴有沒有 `$` 之外的東西
