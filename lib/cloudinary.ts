import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 上傳圖片到 Cloudinary（從 URL）
 * @param url - Notion 臨時 URL 或任何圖片 URL
 * @param folder - Cloudinary 資料夾（如 "makesense/covers"）
 * @param publicId - 自訂 ID（如 notion_id），避免重複上傳
 * @returns Cloudinary 永久 URL 或 null
 */
export async function uploadToCloudinary(
  url: string,
  folder: string,
  publicId: string
): Promise<string | null> {
  try {
    // 跳過已經是 Cloudinary URL 的
    if (url.includes("res.cloudinary.com")) return url;
    // 跳過外部永久 URL（非 Notion 臨時 URL）
    if (!url.includes("secure.notion-static.com") && !url.includes("prod-files-secure")) {
      return url; // 已是永久 URL，不需遷移
    }

    const result = await cloudinary.uploader.upload(url, {
      folder,
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    return result.secure_url;
  } catch (err: any) {
    console.error(`Cloudinary upload failed (${publicId}):`, err.message);
    return null;
  }
}

export default cloudinary;
