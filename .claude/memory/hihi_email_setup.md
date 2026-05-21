---
name: hihi@makesense.ink 收發信設定
description: hihi@makesense.ink 的主機、收信/寄信路徑、費用與歷史調整
type: project
originSessionId: 427a063c-ca95-442d-b067-8ce62bdfea50
---
# hihi@makesense.ink 收發信設定

## 主機
- **Namecheap Private Email**（webmail: https://privateemail.com）
- MX: `mx1.privateemail.com` / `mx2.privateemail.com`
- 顯示名稱：旅人書店/宜蘭文化俱樂部

## 收信路徑（2026/04/24 調整後）
- privateemail webmail → Settings → Mail → 自動轉寄 → 轉寄到 四九 的 Gmail
- **勾「保留訊息副本」**：Gmail 和 privateemail 主機各留一份
- 原本用 Gmailify + POP3，Google 宣布停用後改為轉寄

## 寄信路徑
- Gmail → 設定 → 帳戶和匯入 → 「以這個地址寄送郵件」
- SMTP: `mail.privateemail.com`，SSL 通訊埠 465
- 寄件者顯示：`旅人書店/宜蘭文化俱樂部 <hihi@makesense.ink>`
- **不受 Gmailify 停用影響**，照常使用

## 費用
- US$14.88/年（約 NT$475），Namecheap Private Email 年費

**Why:** 四九 希望在 Gmail 單一介面管所有信箱，同時保留主機副本以防 Gmail 端出事。
**How to apply:** 未來 hihi 收發信出問題時，先確認是轉寄斷了（privateemail 設定）還是 SMTP 斷了（Gmail「寄件地址」設定），不要再往 POP3 / Gmailify 方向找。
