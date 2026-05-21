---
name: Cloudinary 帳號與用途（DEPRECATED）
description: ⚠️ 已停用。Cloudinary 2026/04/29 停用、改用 Cloudflare R2。本檔保留作歷史紀錄。詳見 onedrive_photo_migration.md
type: project
originSessionId: f3fc7c95-b0ee-4b91-a4f0-11ca128852cc
---
⚠️ **DEPRECATED（2026/04/29）**：Cloudinary 已停用（每月 $89 太貴），改用 Cloudflare R2（每月約 $5）。本檔保留以下原始記錄作歷史參考，**請勿沿用其內容當現行設定**。

---

Cloudinary 確定用於照片自動增強畫質，取代原本考慮的 Google Photos 角色。

**帳號資訊：**
- Cloud Name：`drypcu6lg`
- API Key：`858743591889649`
- API Secret：四九 自己保管，需要時由他提供

**用途：**
- AI 增強是針對每張照片個別判斷，不是套固定參數，效果接近 iOS 一鍵增強
- 在照片處理流程中的位置：重新命名 → 去重 → EXIF → 人臉辨識 → **Cloudinary AI 增強** → 四種縮圖 + 浮水印 → 寫進 Notion

**Why:** Cloudinary 的 AI 增強品質好且自動化程度高，免費方案每月 25GB 足夠日常使用。

**How to apply:** 建照片系統時，在 processor.py 的 Pillow 增強步驟後（或取代）加入 Cloudinary API 呼叫。config.py 中已有 Cloudinary 設定區塊。

**費用：**
- 免費方案：每月 25GB
- 初次大量處理（數萬張）可能稍超，超過後約 $0.05/GB，費用極低
