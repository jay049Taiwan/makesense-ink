import { ImageResponse } from "next/og";

// 尺寸：OG 標準 1200×630
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          background: "#f5f0e8",
          position: "relative",
        }}
      >
        {/* 裝飾線條 */}
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 64,
            right: 64,
            height: 2,
            background: "#c8a97e",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 64,
            right: 64,
            height: 2,
            background: "#c8a97e",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 64,
            width: 2,
            height: "calc(100% - 96px)",
            background: "#c8a97e",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 64,
            width: 2,
            height: "calc(100% - 96px)",
            background: "#c8a97e",
          }}
        />

        {/* 中文主標 */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#3d2b1f",
            letterSpacing: "0.08em",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          旅人書店
        </div>

        {/* 分隔符 */}
        <div
          style={{
            margin: "24px 0",
            width: 80,
            height: 3,
            background: "#c8a97e",
            borderRadius: 2,
          }}
        />

        {/* 副標 */}
        <div
          style={{
            fontSize: 36,
            color: "#7a5c40",
            letterSpacing: "0.12em",
            textAlign: "center",
          }}
        >
          宜蘭文化俱樂部
        </div>

        {/* 英文 */}
        <div
          style={{
            marginTop: 32,
            fontSize: 24,
            color: "#a08060",
            letterSpacing: "0.18em",
            textAlign: "center",
          }}
        >
          TRAVELER BOOKSTORE · YILAN
        </div>

        {/* 網址 */}
        <div
          style={{
            position: "absolute",
            bottom: 72,
            fontSize: 20,
            color: "#b09070",
            letterSpacing: "0.1em",
          }}
        >
          makesense.ink
        </div>
      </div>
    ),
    { ...size }
  );
}
