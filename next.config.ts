import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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

export default withNextIntl(nextConfig);
