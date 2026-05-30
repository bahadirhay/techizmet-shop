import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";

export const MARKETPLACE_LISTING_STATUS_LABELS: Record<string, string> = {
  active: "Satışta",
  pending: "Bekliyor",
  inactive: "Pasif",
  rejected: "Reddedildi",
  exported: "XML",
};

export function marketplacePlatformShort(platform: string): string {
  const map: Record<string, string> = {
    trendyol: "TY",
    hepsiburada: "HB",
    amazon_tr: "AMZ",
    n11: "n11",
    ciceksepeti: "ÇS",
    pazarama: "PZR",
  };
  return map[platform] ?? platform.slice(0, 3).toUpperCase();
}

export function marketplacePlatformLabel(platform: string): string {
  return MARKETPLACE_PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
}

export function marketplaceBadgeStyle(platform: string): { bg: string; color: string; border: string } {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    trendyol: { bg: "#fff4e6", color: "#c2410c", border: "#fdba74" },
    hepsiburada: { bg: "#fef2f2", color: "#b91c1c", border: "#fca5a5" },
    amazon_tr: { bg: "#fffbeb", color: "#b45309", border: "#fcd34d" },
    n11: { bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd" },
    ciceksepeti: { bg: "#fdf2f8", color: "#be185d", border: "#f9a8d4" },
    pazarama: { bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  };
  return styles[platform] ?? { bg: "#f4f4f5", color: "#52525b", border: "#d4d4d8" };
}

export function listingStatusStyle(status: string): string {
  if (status === "active") return "opacity-100";
  if (status === "rejected") return "opacity-60 line-through";
  if (status === "inactive") return "opacity-50";
  return "opacity-80";
}
