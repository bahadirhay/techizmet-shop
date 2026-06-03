import { isCardPaymentEnabled, type SiteSettings } from "@/lib/site-settings";

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
    cardEnabled: isCardPaymentEnabled(settings),
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
