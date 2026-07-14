import "server-only";

import type { StoreEfaturaSettings } from "@/lib/site-settings";
import { normalizeConsumerTaxId } from "@/lib/efatura/consumer-tax-id";
import { getSiteSettings } from "@/lib/site-settings";

export type ResolvedEfaturaConfig = {
  enabled: boolean;
  testMode: boolean;
  sellerTitle: string;
  sellerTaxId: string;
  sellerTaxOffice: string;
  sellerAddress: string;
  sellerEmail: string;
  sellerPhone: string;
  sellerProfileCached: boolean;
  username: string;
  password: string;
  defaultConsumerTaxId: string;
  defaultVatRate: number;
  autoSign: boolean;
  autoSendMarketplace: boolean;
  autoInvoiceOnShip: boolean;
};

export function parseEfaturaSettings(raw: StoreEfaturaSettings | undefined): ResolvedEfaturaConfig {
  const e = raw ?? {};
  return {
    enabled: e.enabled === true,
    testMode: e.testMode === true,
    sellerTitle: e.sellerTitle?.trim() ?? "",
    sellerTaxId: e.sellerTaxId?.trim() ?? "",
    sellerTaxOffice: e.sellerTaxOffice?.trim() ?? "",
    sellerAddress: e.sellerAddress?.trim() ?? "",
    sellerEmail: e.sellerEmail?.trim() ?? "",
    sellerPhone: e.sellerPhone?.trim() ?? "",
    sellerProfileCached: e.sellerProfileCached === true,
    username: (e.username?.trim() || process.env.GIB_USERNAME?.trim() || ""),
    password: (process.env.GIB_PASSWORD?.trim() || e.password?.trim() || ""),
    defaultConsumerTaxId: normalizeConsumerTaxId(e.defaultConsumerTaxId?.trim() || "11111111111"),
    defaultVatRate: typeof e.defaultVatRate === "number" && e.defaultVatRate >= 0 ? e.defaultVatRate : 20,
    autoSign: e.autoSign !== false,
    autoSendMarketplace: e.autoSendMarketplace !== false,
    autoInvoiceOnShip: e.autoInvoiceOnShip === true,
  };
}

export async function getEfaturaConfig(siteId: string): Promise<ResolvedEfaturaConfig> {
  const settings = await getSiteSettings(siteId);
  return parseEfaturaSettings(settings.efatura);
}

export function efaturaReady(config: ResolvedEfaturaConfig): boolean {
  return config.enabled && Boolean(config.username && config.password);
}
