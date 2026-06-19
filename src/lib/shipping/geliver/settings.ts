import "server-only";

import type { SiteSettings } from "@/lib/site-settings";
import type { GeliverParcelDefaults, GeliverSiteSettings } from "@/lib/shipping/geliver/types";

const DEFAULT_PARCEL: Required<Pick<GeliverParcelDefaults, "length" | "width" | "height" | "weight">> & {
  distanceUnit: "cm";
  massUnit: "kg";
} = {
  length: "20.0",
  width: "15.0",
  height: "10.0",
  weight: "1.0",
  distanceUnit: "cm",
  massUnit: "kg",
};

export type ResolvedGeliverConfig = {
  configured: boolean;
  enabled: boolean;
  missing: string[];
  apiToken: string | null;
  senderAddressId: string | null;
  testMode: boolean;
  autoAcceptCheapestOffer: boolean;
  autoMarkShipped: boolean;
  providerServiceCode: string | null;
  parcel: GeliverParcelDefaults & { length: string; width: string; height: string; weight: string; distanceUnit: "cm" | "in"; massUnit: "kg" | "lb" };
  storeUrl: string;
};

export function geliverSettingsFromSite(settings: SiteSettings): GeliverSiteSettings {
  return settings.geliver ?? {};
}

export function resolveGeliverConfig(settings: SiteSettings, siteUrl?: string | null): ResolvedGeliverConfig {
  const g = geliverSettingsFromSite(settings);
  const missing: string[] = [];
  const apiToken = g.apiToken?.trim() || process.env.GELIVER_TOKEN?.trim() || null;
  const senderAddressId = g.senderAddressId?.trim() || null;
  if (!apiToken) missing.push("API token");
  if (!senderAddressId) missing.push("Gönderici adres ID");
  const parcel = {
    ...DEFAULT_PARCEL,
    ...g.parcel,
    distanceUnit: g.parcel?.distanceUnit ?? DEFAULT_PARCEL.distanceUnit,
    massUnit: g.parcel?.massUnit ?? DEFAULT_PARCEL.massUnit,
  };
  const storeUrl =
    siteUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
    "https://localhost";

  return {
    configured: missing.length === 0,
    enabled: g.enabled === true,
    missing,
    apiToken,
    senderAddressId,
    testMode: g.testMode === true,
    autoAcceptCheapestOffer: g.autoAcceptCheapestOffer !== false,
    autoMarkShipped: g.autoMarkShipped !== false,
    providerServiceCode: g.providerServiceCode?.trim() || null,
    parcel,
    storeUrl: storeUrl.replace(/\/$/, ""),
  };
}

export function geliverReady(settings: SiteSettings, siteUrl?: string | null): boolean {
  const cfg = resolveGeliverConfig(settings, siteUrl);
  return cfg.enabled && Boolean(cfg.apiToken);
}

export function geliverShipmentReady(settings: SiteSettings, siteUrl?: string | null): boolean {
  const cfg = resolveGeliverConfig(settings, siteUrl);
  return geliverReady(settings, siteUrl) && Boolean(cfg.senderAddressId);
}
