import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { sniffImageMime, sniffVideoMime } from "@/lib/admin/file-sniff";
import sharp from "sharp";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_WIDTH = 1920;
const WEBP_QUALITY = 82;

export type SavedUpload = {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Vercel — dosya Neon DB'de saklanır */
  dbBuffer?: Buffer;
};

function isServerlessReadonlyFs(): boolean {
  return process.env.VERCEL === "1" || process.cwd().startsWith("/var/task");
}

export async function saveUploadedImage(siteId: string, file: File): Promise<SavedUpload> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Dosya en fazla 8 MB olabilir.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buf);
  if (!sniffed || !IMAGE_MIME.has(sniffed)) {
    throw new Error("Yalnızca JPEG, PNG, WebP veya GIF yüklenebilir.");
  }

  // GIF'i olduğu gibi sakla; diğer tüm formatları WebP'ye dönüştür ve boyutlandır
  if (sniffed === "image/gif") {
    return writeUpload(siteId, buf, "gif", sniffed, file.size);
  }

  const converted = await sharp(buf)
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return writeUpload(siteId, converted, "webp", "image/webp", converted.length);
}

export async function saveUploadedVideo(siteId: string, file: File): Promise<SavedUpload> {
  if (file.size > 80 * 1024 * 1024) {
    throw new Error("Video en fazla 80 MB olabilir.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffVideoMime(buf);
  if (!sniffed || !VIDEO_MIME.has(sniffed)) {
    throw new Error("Yalnızca MP4, WebM veya MOV (video) yüklenebilir.");
  }

  const ext = sniffed === "video/webm" ? "webm" : sniffed === "video/quicktime" ? "mov" : "mp4";
  return writeUpload(siteId, buf, ext, sniffed, file.size);
}

async function writeUpload(
  siteId: string,
  buf: Buffer,
  ext: string,
  mime: string,
  sizeBytes: number,
): Promise<SavedUpload> {
  const token = randomBytes(8).toString("hex");
  const filename = `${Date.now()}-${token}.${ext}`;

  if (isServerlessReadonlyFs()) {
    return {
      url: "",
      filename,
      mimeType: mime,
      sizeBytes,
      dbBuffer: buf,
    };
  }

  const relPath = join("uploads", "shop", siteId, filename);
  const absDir = join(process.cwd(), "public", "uploads", "shop", siteId);
  await mkdir(absDir, { recursive: true });
  await writeFile(join(absDir, filename), buf);

  return {
    url: `/${relPath.replace(/\\/g, "/")}`,
    filename,
    mimeType: mime,
    sizeBytes,
  };
}

/** Sunucu tarafı (AI görsel vb.) — buffer kaydı */
export async function saveImageBuffer(
  siteId: string,
  buf: Buffer,
  mime = "image/png",
): Promise<SavedUpload> {
  const ext =
    mime === "image/webp" ? "webp" : mime === "image/jpeg" ? "jpg" : mime === "image/gif" ? "gif" : "png";
  return writeUpload(siteId, buf, ext, mime, buf.length);
}
