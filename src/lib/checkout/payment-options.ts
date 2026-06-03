import type { SiteSettings } from "@/lib/site-settings";

/** İstemci güvenli — paytr.ts (node:crypto) kullanılmaz */
function isPaytrConfigured(settings: SiteSettings): boolean {
  const p = settings.payment?.paytr;
  return Boolean(p?.merchantId?.trim() && p?.merchantKey?.trim() && p?.merchantSalt?.trim());
}

export type CheckoutPaymentFlags = {
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  bankAccounts: { bank: string; iban: string; holder: string }[];
};

export type PaymentMethodId = "cod" | "bank_transfer" | "card";

/** Admin panelinde açık olan yöntemler — varsayılan true değil */
export function getCheckoutPaymentFlags(settings: SiteSettings): CheckoutPaymentFlags {
  return {
    codEnabled: settings.payment?.codEnabled === true,
    bankTransferEnabled: settings.payment?.bankTransferEnabled === true,
    cardEnabled: isPaytrConfigured(settings),
    bankAccounts: settings.payment?.bankAccounts ?? [],
  };
}

export function hasAnyCheckoutPaymentMethod(flags: CheckoutPaymentFlags): boolean {
  return flags.codEnabled || flags.bankTransferEnabled || flags.cardEnabled;
}

export function resolveDefaultPaymentMethod(flags: CheckoutPaymentFlags): PaymentMethodId | null {
  if (flags.codEnabled) return "cod";
  if (flags.bankTransferEnabled) return "bank_transfer";
  if (flags.cardEnabled) return "card";
  return null;
}
