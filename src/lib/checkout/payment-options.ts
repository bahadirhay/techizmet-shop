import type { SiteSettings } from "@/lib/site-settings";
import {
  cardProviderLabel,
  resolveCardProvider,
  type CardProviderId,
} from "@/lib/payments/card-provider";
import { iyzicoConfigStatus } from "@/lib/payments/iyzico";

/** İstemci güvenli — paytr.ts (node:crypto) kullanılmaz */
function isPaytrConfigured(settings: SiteSettings): boolean {
  const p = settings.payment?.paytr;
  return Boolean(p?.merchantId?.trim() && p?.merchantKey?.trim() && p?.merchantSalt?.trim());
}

export type CheckoutPaymentFlags = {
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  cardProvider: CardProviderId | null;
  cardProviderLabel: string | null;
  /** Aktif kart sağlayıcısı test modunda mı */
  cardTestMode: boolean;
  /** @deprecated use cardTestMode */
  paytrTestMode: boolean;
  bankAccounts: { bank: string; iban: string; holder: string }[];
};

export type PaymentMethodId = "cod" | "bank_transfer" | "card" | "open_account";

/** Admin panelinde açık olan yöntemler — varsayılan true değil */
export function getCheckoutPaymentFlags(settings: SiteSettings): CheckoutPaymentFlags {
  const cardProvider = resolveCardProvider(settings);
  const cardEnabled = cardProvider !== null;
  const iyzicoStatus = iyzicoConfigStatus(settings);
  const cardTestMode =
    cardProvider === "iyzico"
      ? iyzicoStatus.testMode
      : cardProvider === "paytr"
        ? settings.payment?.paytr?.testMode === true
        : false;

  return {
    codEnabled: settings.payment?.codEnabled === true,
    bankTransferEnabled: settings.payment?.bankTransferEnabled === true,
    cardEnabled,
    cardProvider,
    cardProviderLabel: cardProvider ? cardProviderLabel(cardProvider) : null,
    cardTestMode,
    paytrTestMode: cardTestMode,
    bankAccounts: settings.payment?.bankAccounts ?? [],
  };
}

export function hasAnyCheckoutPaymentMethod(flags: CheckoutPaymentFlags & { openAccount?: { enabled: boolean } }): boolean {
  return (
    flags.codEnabled ||
    flags.bankTransferEnabled ||
    flags.cardEnabled ||
    Boolean(flags.openAccount?.enabled)
  );
}

export function resolveDefaultPaymentMethod(flags: CheckoutPaymentFlags): PaymentMethodId | null {
  if (flags.cardEnabled && !flags.codEnabled && !flags.bankTransferEnabled) return "card";
  if (flags.codEnabled) return "cod";
  if (flags.bankTransferEnabled) return "bank_transfer";
  if (flags.cardEnabled) return "card";
  return null;
}

export function paytrConfigStatus(settings: SiteSettings): {
  configured: boolean;
  missing: string[];
} {
  const p = settings.payment?.paytr;
  const missing: string[] = [];
  if (!p?.merchantId?.trim()) missing.push("Mağaza no");
  if (!p?.merchantKey?.trim()) missing.push("Merchant key");
  if (!p?.merchantSalt?.trim()) missing.push("Merchant salt");
  return { configured: missing.length === 0, missing };
}

export { iyzicoConfigStatus };
