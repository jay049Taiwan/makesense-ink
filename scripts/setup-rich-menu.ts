/**
 * Rich Menu 設定腳本
 * 用法：npx tsx scripts/setup-rich-menu.ts
 *
 * 建立 6 按鈕 Rich Menu 並設為預設
 * 需要環境變數：LINE_CHANNEL_ACCESS_TOKEN, NEXT_PUBLIC_LIFF_ID
 */

import { messagingApi } from "@line/bot-sdk";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "2009300819-5OyjRae6";
const LIFF_BASE = `https://liff.line.me/${LIFF_ID}`;

if (!TOKEN) {
  console.error("❌ 請設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
  process.exit(1);
}

const client = new messagingApi.MessagingApiClient({ channelAccessToken: TOKEN });

function liffUrl(path: string) {
  return `${LIFF_BASE}/${path}?liff_mode=true`;
}

async function main() {
  console.log("🔧 建立 Rich Menu...\n");

  // Rich Menu 規格：2500 x 1686，3x2 格
  const richMenuObject = {
    size: { width: 2500, height: 1686 },
    selected: true, // 預設展開
    name: "旅人書店主選單",
    chatBarText: "📚 選單",
    areas: [
      // 第一排
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "uri" as const, label: "選書選物", uri: liffUrl("liff/shop") },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "uri" as const, label: "活動體驗", uri: liffUrl("liff/events") },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "uri" as const, label: "觀點漫遊", uri: liffUrl("liff/viewpoints") },
      },
      // 第二排
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "uri" as const, label: "確認結帳", uri: liffUrl("checkout") },
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "uri" as const, label: "地方通訊", uri: liffUrl("liff/newsletter") },
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "uri" as const, label: "會員中心", uri: liffUrl("liff/member") },
      },
    ],
  };

  try {
    // 1. 建立 Rich Menu
    const result = await client.createRichMenu(richMenuObject);
    const richMenuId = result.richMenuId;
    console.log(`✅ Rich Menu 建立成功: ${richMenuId}`);

    // 2. 設為預設 Rich Menu
    await client.setDefaultRichMenu(richMenuId);
    console.log(`✅ 已設為預設 Rich Menu`);

    console.log(`\n📋 Rich Menu ID: ${richMenuId}`);
    console.log(`\n⚠️  注意：還需要上傳 Rich Menu 圖片（2500x1686 PNG）`);
    console.log(`   用法：npx tsx scripts/upload-rich-menu-image.ts ${richMenuId} <image-path>`);
    console.log(`\n📱 按鈕配置：`);
    console.log(`   📚 選書選物 → ${liffUrl("liff/shop")}`);
    console.log(`   🎪 活動體驗 → ${liffUrl("liff/events")}`);
    console.log(`   🗺️ 觀點漫遊 → ${liffUrl("liff/viewpoints")}`);
    console.log(`   🛒 確認結帳 → ${liffUrl("checkout")}`);
    console.log(`   📮 地方通訊 → ${liffUrl("liff/newsletter")}`);
    console.log(`   👤 會員中心 → ${liffUrl("liff/member")}`);
  } catch (err: any) {
    console.error("❌ 建立失敗:", err.message);
    if (err.statusCode === 401) {
      console.error("   → LINE_CHANNEL_ACCESS_TOKEN 可能無效或過期");
    }
    process.exit(1);
  }
}

main();
