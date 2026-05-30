import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

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
  return writeUpload(siteId, buf, ext, mime, file.size);
}

export async function saveUploadedVideo(siteId: string, file: File): Promise<SavedUpload> {
  const mime = file.type || "application/octet-stream";
  if (!VIDEO_MIME.has(mime)) {
    throw new Error("Yalnızca MP4, WebM veya MOV (video) yüklenebilir.");
  }
  if (file.size > 80 * 1024 * 1024) {
    throw new Error("Video en fazla 80 MB olabilir.");
  }

  const ext = mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : "mp4";
  const buf = Buffer.from(await file.arrayBuffer());
  return writeUpload(siteId, buf, ext, mime, file.size);
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
