import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-23c93c89519e48958e84298739337568.r2.dev" },
      { protocol: "https", hostname: "res.cloudinary.com" }, // 舊 URL 向後相容
      { protocol: "https", hostname: "*.notion-static.com" },
      { protocol: "https", hostname: "prod-files-secure.s3.us-west-2.amazonaws.com" },
    ],
  },
  typescript: {
    // next-auth@5 beta 缺少型別宣告，先跳過 build 時的 TS 檢查
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
