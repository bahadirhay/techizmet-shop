/** Yüklenen dosya içeriği — istemci MIME tipine güvenilmez */

export function sniffImageMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function sniffVideoMime(buf: Buffer): "video/mp4" | "video/webm" | "video/quicktime" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
  const brand = buf.slice(4, 8).toString("ascii");
  if (brand === "ftyp") {
    const minor = buf.slice(8, 12).toString("ascii");
    if (minor.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  return null;
}
