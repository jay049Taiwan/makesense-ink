import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * GET /api/placeholder?text=噶瑪蘭族歷史&bg=7a5c40&fg=faf8f4
 * 動態產生 1024x1024 的中文 banner 圖，用於 LINE Image Carousel 的 fallback
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") || "旅人書店").slice(0, 20);
  const bg = (searchParams.get("bg") || "7a5c40").replace(/[^0-9a-fA-F]/g, "").slice(0, 6) || "7a5c40";
  const fg = (searchParams.get("fg") || "faf8f4").replace(/[^0-9a-fA-F]/g, "").slice(0, 6) || "faf8f4";

  let fontData: ArrayBuffer | null = null;
  try {
    fontData = await fetch(
      "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/TraditionalChinese/NotoSansTC-Bold.otf",
      { cache: "force-cache" }
    ).then((r) => (r.ok ? r.arrayBuffer() : null));
  } catch {
    fontData = null;
  }

  const fontSize = text.length <= 6 ? 160 : text.length <= 10 ? 120 : text.length <= 14 ? 96 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, #${bg} 0%, #${bg}dd 100%)`,
          color: `#${fg}`,
          padding: 80,
          fontFamily: fontData ? "NotoSansTC" : "sans-serif",
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.7, marginBottom: 40, letterSpacing: 8 }}>旅人書店</div>
        <div
          style={{
            fontSize,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: "90%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {text}
        </div>
      </div>
    ),
    {
      width: 1024,
      height: 1024,
      fonts: fontData
        ? [{ name: "NotoSansTC", data: fontData, style: "normal", weight: 700 }]
        : undefined,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
      },
    }
  );
}
