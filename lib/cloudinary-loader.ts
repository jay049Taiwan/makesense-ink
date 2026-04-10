/**
 * Cloudinary image loader for Next.js
 *
 * 用法：
 *   <Image src="https://res.cloudinary.com/drypcu6lg/image/upload/v123/photo.jpg" width={800} height={600} alt="照片" />
 *
 * Next.js 會自動透過這個 loader 加上 Cloudinary 的變換參數：
 * - 自動最佳格式（WebP/AVIF）
 * - 自動畫質
 * - 指定寬度
 */

const CLOUD_NAME = "drypcu6lg";

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderParams): string {
  // 如果已經是 Cloudinary URL，直接加變換參數
  if (src.includes("res.cloudinary.com")) {
    const params = [
      `w_${width}`,
      `q_${quality || "auto"}`,
      "f_auto",
      "c_limit",
    ].join(",");

    return src.replace("/upload/", `/upload/${params}/`);
  }

  // 非 Cloudinary URL → 用 Cloudinary fetch 模式（從外部 URL 載入並優化）
  const params = [
    `w_${width}`,
    `q_${quality || "auto"}`,
    "f_auto",
    "c_limit",
  ].join(",");

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${params}/${encodeURIComponent(src)}`;
}
