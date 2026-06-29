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
