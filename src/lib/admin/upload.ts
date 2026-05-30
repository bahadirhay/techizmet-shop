import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function isServerlessReadonlyFs(): boolean {
  return process.env.VERCEL === "1" || process.cwd().startsWith("/var/task");
}

export async function saveUploadedImage(
  siteId: string,
  file: File,
): Promise<{ url: string; filename: string; mimeType: string; sizeBytes: number }> {
  const mime = file.type || "application/octet-stream";
  if (!IMAGE_MIME.has(mime)) {
    throw new Error("Yalnızca JPEG, PNG, WebP, GIF veya SVG yüklenebilir.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Dosya en fazla 8 MB olabilir.");
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/gif"
          ? "gif"
          : mime === "image/svg+xml"
            ? "svg"
            : "jpg";

  const buf = Buffer.from(await file.arrayBuffer());
  return writeUpload(siteId, file, buf, ext, mime);
}

export async function saveUploadedVideo(
  siteId: string,
  file: File,
): Promise<{ url: string; filename: string; mimeType: string; sizeBytes: number }> {
  const mime = file.type || "application/octet-stream";
  if (!VIDEO_MIME.has(mime)) {
    throw new Error("Yalnızca MP4, WebM veya MOV (video) yüklenebilir.");
  }
  if (file.size > 80 * 1024 * 1024) {
    throw new Error("Video en fazla 80 MB olabilir.");
  }

  const ext = mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : "mp4";

  const buf = Buffer.from(await file.arrayBuffer());
  return writeUpload(siteId, file, buf, ext, mime);
}

async function writeUpload(
  siteId: string,
  file: File,
  buf: Buffer,
  ext: string,
  mime: string,
): Promise<{ url: string; filename: string; mimeType: string; sizeBytes: number }> {
  const token = randomBytes(8).toString("hex");
  const filename = `${Date.now()}-${token}.${ext}`;
  const relPath = `uploads/shop/${siteId}/${filename}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(relPath, buf, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      filename,
      mimeType: mime,
      sizeBytes: file.size,
    };
  }

  if (isServerlessReadonlyFs()) {
    throw new Error(
      "Canlı ortamda dosya yüklemek için Vercel Blob Storage gerekli. " +
        "Vercel Dashboard → Storage → Blob Store oluşturun ve projeye bağlayın " +
        "(BLOB_READ_WRITE_TOKEN otomatik eklenir).",
    );
  }

  const absDir = join(process.cwd(), "public", "uploads", "shop", siteId);
  await mkdir(absDir, { recursive: true });
  await writeFile(join(absDir, filename), buf);

  return {
    url: `/${relPath}`,
    filename,
    mimeType: mime,
    sizeBytes: file.size,
  };
}
