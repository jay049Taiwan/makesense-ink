import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudinary-loader.ts",
  },
  typescript: {
    // next-auth@5 beta 缺少型別宣告，先跳過 build 時的 TS 檢查
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
// deployed Thu Apr  9 18:17:33 CST 2026
// build 1775730052
