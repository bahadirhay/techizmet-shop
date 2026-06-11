import type { SiteSettings } from "@/lib/site-settings";

export function resolveWebShippingCostMinor(settings: SiteSettings): number {
  const raw = settings.finance?.webShippingCostMinor;
  if (typeof raw === "number" && raw >= 0) return raw;
  return 0;
}

export function resolvePackagingCostMinor(settings: SiteSettings): number {
  const raw = settings.finance?.packagingCostMinor;
  if (typeof raw === "number" && raw >= 0) return raw;
  return 0;
}
