import type { SiteSettings } from "@/lib/site-settings";
import { getIyzicoConfig } from "@/lib/payments/iyzico";
import { getPaytrConfig } from "@/lib/payments/paytr";

export type CardProviderId = "paytr" | "iyzico";

export function resolveCardProvider(settings: SiteSettings): CardProviderId | null {
  const preferred = settings.payment?.cardProvider === "paytr" ? "paytr" : "iyzico";
  const paytrOk = getPaytrConfig(settings) !== null;
  const iyzicoOk = getIyzicoConfig(settings) !== null;

  if (preferred === "iyzico" && iyzicoOk) return "iyzico";
  if (preferred === "paytr" && paytrOk) return "paytr";
  if (iyzicoOk) return "iyzico";
  if (paytrOk) return "paytr";
  return null;
}

export function cardProviderLabel(provider: CardProviderId): string {
  return provider === "iyzico" ? "iyzico" : "PayTR";
}

export function isCardProviderConfigured(
  settings: SiteSettings,
  provider: CardProviderId,
): boolean {
  return provider === "iyzico"
    ? getIyzicoConfig(settings) !== null
    : getPaytrConfig(settings) !== null;
}
