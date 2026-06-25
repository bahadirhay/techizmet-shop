import sharp from "sharp";

export async function resizeImageBuffer(
  input: Buffer,
  width: number,
  mime?: string | null,
): Promise<{ body: Buffer; mimeType: string }> {
  const safeWidth = Math.min(2000, Math.max(48, Math.round(width)));
  const pipeline = sharp(input).rotate().resize({ width: safeWidth, withoutEnlargement: true });
  const lower = (mime ?? "").toLowerCase();

  if (lower.includes("png")) {
    return {
      body: await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer(),
      mimeType: "image/png",
    };
  }

  return {
    body: await pipeline.webp({ quality: 82 }).toBuffer(),
    mimeType: "image/webp",
  };
}
