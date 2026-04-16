import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "旅人書店/宜蘭文化俱樂部",
    short_name: "旅人書店",
    description: "旅人書店・宜蘭文化俱樂部 — 以宜蘭為根的地方文化永續生態系",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#7a5c40",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
