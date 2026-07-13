import "server-only";

import sharp from "sharp";
import type { SocialImageAspect } from "@/lib/admin/social-content/creative-brief";
import { toAbsoluteMediaUrl } from "@/lib/seo/site-url";

export type SocialOverlayTemplate = "hero" | "minimal";

export type SocialComposeOptions = {
  siteName: string;
  productTitle: string;
  priceLabel: string;
  logoUrl?: string | null;
  accentColor?: string;
  template?: SocialOverlayTemplate;
  aspect: SocialImageAspect;
  badgeText?: string | null;
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  const abs = toAbsoluteMediaUrl(url);
  if (!abs) return null;
  try {
    const res = await fetch(abs, { signal: AbortSignal.timeout(45_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 50 ? buf : null;
  } catch {
    return null;
  }
}

function buildOverlaySvg(params: {
  width: number;
  height: number;
  siteName: string;
  productTitle: string;
  priceLabel: string;
  accentColor: string;
  template: SocialOverlayTemplate;
  badgeText?: string | null;
}): Buffer {
  const { width, height, accentColor, template } = params;
  const barRatio = template === "minimal" ? 0.16 : 0.22;
  const barHeight = Math.round(height * barRatio);
  const pad = Math.round(width * 0.04);
  const titleSize = template === "minimal" ? Math.round(width * 0.038) : Math.round(width * 0.045);
  const priceSize = template === "minimal" ? Math.round(width * 0.05) : Math.round(width * 0.058);
  const siteSize = Math.round(width * 0.028);
  const titleY = height - barHeight + pad + titleSize;
  const priceY = titleY + Math.round(titleSize * 1.35);
  const siteY = height - pad;

  const badge =
    params.badgeText && template === "hero"
      ? `<rect x="${pad}" y="${height - barHeight - Math.round(height * 0.06)}" rx="8" ry="8" width="${Math.round(width * 0.22)}" height="${Math.round(height * 0.045)}" fill="${accentColor}" opacity="0.92"/>
<text x="${pad + 12}" y="${height - barHeight - Math.round(height * 0.028)}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${siteSize}" font-weight="700">${escapeXml(params.badgeText)}</text>`
      : "";

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="35%" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="url(#bar)"/>
  <rect x="0" y="${height - 4}" width="${width}" height="4" fill="${accentColor}"/>
  ${badge}
  <text x="${pad}" y="${titleY}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(truncate(params.productTitle, 48))}</text>
  <text x="${pad}" y="${priceY}" fill="#f5e6d3" font-family="Arial, Helvetica, sans-serif" font-size="${priceSize}" font-weight="800">${escapeXml(params.priceLabel)}</text>
  <text x="${width - pad}" y="${siteY}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${siteSize}" font-weight="600" text-anchor="end" opacity="0.9">${escapeXml(truncate(params.siteName, 28))}</text>
</svg>`;

  return Buffer.from(svg);
}

export function detectNaturalProductBadge(title: string, description: string): string | null {
  const lower = `${title} ${description}`.toLocaleLowerCase("tr");
  if (/100\s*%?\s*doğal|doğal|natural|katkısız|organik/.test(lower)) return "%100 Doğal";
  return null;
}

/** AI görselinin üzerine marka katmanı (logo, fiyat, başlık) ekler */
export async function applySocialBrandOverlay(
  imageBuffer: Buffer,
  options: SocialComposeOptions,
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  const accent = options.accentColor?.trim() || "#8B5E3C";
  const template = options.template ?? "hero";

  const overlaySvg = buildOverlaySvg({
    width,
    height,
    siteName: options.siteName,
    productTitle: options.productTitle,
    priceLabel: options.priceLabel,
    accentColor: accent,
    template,
    badgeText: options.badgeText,
  });

  const composites: sharp.OverlayOptions[] = [
    { input: overlaySvg, top: 0, left: 0 },
  ];

  if (options.logoUrl?.trim()) {
    const logoBuf = await downloadImage(options.logoUrl);
    if (logoBuf) {
      const logoHeight = Math.round(height * (template === "minimal" ? 0.06 : 0.075));
      const logoPng = await sharp(logoBuf)
        .resize({ height: logoHeight, fit: "inside" })
        .png()
        .toBuffer();
      composites.push({ input: logoPng, top: Math.round(height * 0.03), left: Math.round(width * 0.03) });
    }
  }

  return sharp(imageBuffer)
    .composite(composites)
    .webp({ quality: 88 })
    .toBuffer();
}
