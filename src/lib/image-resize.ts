import sharp from "sharp";

export async function resizeImageBuffer(
  input: Buffer,
  width: number,
  mime?: string | null,
): Promise<{ body: Buffer; mimeType: string }> {
  const safeWidth = Math.min(2000, Math.max(48, Math.round(width)));
  const lower = (mime ?? "").toLowerCase();

  // GIF boyutlandırılmaz — animasyon bozulur
  if (lower.includes("gif")) {
    return { body: input, mimeType: "image/gif" };
  }

  const body = await sharp(input)
    .rotate()
    .resize({ width: safeWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return { body, mimeType: "image/webp" };
}

/** Amazon / pazar yeri — JPEG, en uzun kenar 1000–2500 px (WebP kabul edilmez). */
export async function toMarketplaceJpegBuffer(
  input: Buffer,
  options?: { minLongestSide?: number; maxLongestSide?: number },
): Promise<{ body: Buffer; mimeType: string }> {
  const minLong = options?.minLongestSide ?? 1000;
  const maxLong = options?.maxLongestSide ?? 2500;

  const rotated = sharp(input).rotate();
  const meta = await rotated.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const longest = Math.max(w, h, 1);

  let targetLongest = longest;
  if (longest < minLong) targetLongest = minLong;
  else if (longest > maxLong) targetLongest = maxLong;

  const scale = targetLongest / longest;
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const body = await sharp(input)
    .rotate()
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .jpeg({ quality: 90, mozjpeg: true })
    .withMetadata({ density: 72 })
    .toBuffer();

  return { body, mimeType: "image/jpeg" };
}
