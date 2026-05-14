import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET!;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

/**
 * 上傳圖片到 R2（從 URL）
 * @param url - Notion 臨時 URL 或任何圖片 URL
 * @param folder - R2 資料夾（如 "makesense/events"）
 * @param key - 唯一 key（如 notion_id），避免重複上傳
 * @returns R2 永久 URL 或 null
 */
export async function uploadToR2(
  url: string,
  folder: string,
  key: string
): Promise<string | null> {
  try {
    // 跳過已經是 R2 URL 的
    if (PUBLIC_URL && url.startsWith(PUBLIC_URL)) return url;
    // 跳過外部永久 URL（非 Notion 臨時 URL）
    if (!url.includes("secure.notion-static.com") && !url.includes("prod-files-secure")) {
      return url;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const objectKey = `${folder}/${key}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      Body: buf,
      ContentType: contentType,
    }));

    return `${PUBLIC_URL}/${objectKey}`;
  } catch (err: any) {
    console.error(`R2 upload failed (${key}):`, err.message);
    return null;
  }
}

/**
 * 上傳 Buffer 到 R2（用於用戶上傳的檔案）
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  folder: string,
  key?: string
): Promise<string | null> {
  try {
    const objectKey = key
      ? `${folder}/${key}.jpg`
      : `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: "image/jpeg",
    }));

    return `${PUBLIC_URL}/${objectKey}`;
  } catch (err: any) {
    console.error(`R2 buffer upload failed:`, err.message);
    return null;
  }
}

export default r2;
