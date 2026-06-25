import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { SiteSettings } from "@/lib/site-settings";

const DEFAULT_LOGO = "/theme/techizmet-shop/cdn/shop/files/noor-dark-logo34d3.svg";
const DEFAULT_LOGO_LIGHT = "/theme/techizmet-shop/cdn/shop/files/noor-white-logo34d3.svg";

function brandingAssetOk(url: string | undefined): boolean {
  const u = url?.trim();
  if (!u) return false;
  if (u.startsWith("http://") || u.startsWith("https://")) return true;
  if (!u.startsWith("/")) return false;
  const path = u.split("?")[0]!;
  if (path.startsWith("/api/media/")) return true;
  if (path.startsWith("/theme/")) return true;
  /** Vercel'de diskte olmasa da CDN/DB üzerinden sunulur */
  if (path.startsWith("/uploads/")) return true;
  const rel = path.replace(/^\//, "");
  return existsSync(join(process.cwd(), "public", rel));
}

export function getSiteBranding(settings: SiteSettings) {
  const b = settings.branding ?? {};
  const logoCandidate = b.logoUrl?.trim();
  const lightCandidate = b.logoUrlLight?.trim();
  const logoUrl = brandingAssetOk(logoCandidate) ? logoCandidate! : DEFAULT_LOGO;
  const logoUrlLight = brandingAssetOk(lightCandidate)
    ? lightCandidate!
    : brandingAssetOk(logoCandidate)
      ? logoCandidate!
      : DEFAULT_LOGO_LIGHT;
  return {
    logoUrl,
    logoUrlLight,
    faviconUrl: brandingAssetOk(b.faviconUrl?.trim()) ? b.faviconUrl!.trim() : "/favicon.ico",
  };
}
