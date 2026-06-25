import "server-only";

import { parseCarrierConfig, type CarrierConfig } from "@/lib/shipping/carrier-config";
import type { HepsijetCarrierConfig } from "@/lib/shipping/hepsijet/types";

export type ResolvedHepsijetConfig = HepsijetCarrierConfig & {
  configured: boolean;
  missing: string[];
};

export function resolveHepsijetConfigFromCarrier(carrier: {
  code: string;
  configJson: string | null;
}): ResolvedHepsijetConfig | null {
  const cfg = parseCarrierConfig(carrier.configJson);
  if (cfg.provider !== "hepsijet" && carrier.code !== "hepsijet") return null;
  if (cfg.provider !== "hepsijet" && carrier.code === "hepsijet") {
    return resolveHepsijetConfigFromParsed({
      ...cfg,
      provider: "hepsijet",
    });
  }
  return resolveHepsijetConfigFromParsed(cfg);
}

function resolveHepsijetConfigFromParsed(cfg: CarrierConfig): ResolvedHepsijetConfig {
  const missing: string[] = [];
  const apiUsername = cfg.apiUsername?.trim() || "";
  const apiPassword = cfg.apiPassword?.trim() || "";
  const abbreviationCode = (cfg.abbreviationCode || cfg.apiCustomerCode || "").trim().toUpperCase();
  const companyName = cfg.companyName?.trim() || "";
  const companyAddressId = cfg.companyAddressId?.trim() || "";
  const currentXDockCode = cfg.currentXDockCode?.trim() || "";

  if (!apiUsername) missing.push("API kullanıcı adı");
  if (!apiPassword) missing.push("API şifre");
  if (!abbreviationCode) missing.push("Kısaltma kodu");
  if (!companyName) missing.push("Firma adı");
  if (!companyAddressId) missing.push("Gönderici adres ID");
  if (!currentXDockCode) missing.push("Aktarma merkezi kodu");

  return {
    apiUsername,
    apiPassword,
    abbreviationCode,
    companyName,
    companyAddressId,
    currentXDockCode,
    contractNo: cfg.contractNo?.trim(),
    testMode: cfg.testMode === true,
    productCode: (cfg.productCode as HepsijetCarrierConfig["productCode"]) || "HX_STD",
    deliveryType: (cfg.deliveryType as HepsijetCarrierConfig["deliveryType"]) || "RETAIL",
    autoMarkShipped: cfg.autoMarkShipped !== false,
    configured: missing.length === 0,
    missing,
  };
}

export function hepsijetReady(carrier: { code: string; configJson: string | null; active: boolean }): boolean {
  if (!carrier.active) return false;
  const cfg = resolveHepsijetConfigFromCarrier(carrier);
  return Boolean(cfg?.configured);
}
