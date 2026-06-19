import "server-only";

import type { SiteSettings } from "@/lib/site-settings";
import {
  getCheckoutPaymentFlags,
  type CheckoutPaymentFlags,
} from "@/lib/checkout/payment-options";
import { getB2bOpenAccountEligibility } from "@/lib/finance/b2b-credit";

export type CheckoutPaymentContext = CheckoutPaymentFlags & {
  openAccount: {
    enabled: boolean;
    paymentTermDays: number | null;
    availableCreditMinor: number | null;
    creditLimitMinor: number | null;
    groupName: string | null;
    hint?: string;
  };
};

export async function getCheckoutPaymentContext(
  settings: SiteSettings,
  siteId: string,
  customerId: string | null | undefined,
): Promise<CheckoutPaymentContext> {
  const base = getCheckoutPaymentFlags(settings);
  const b2b = await getB2bOpenAccountEligibility(siteId, customerId);

  let hint: string | undefined;
  if (b2b.eligible && b2b.paymentTermDays) {
    hint = `Vade: ${b2b.paymentTermDays} gün`;
    if (b2b.creditLimitMinor != null) {
      hint += ` · Limit: ${Math.floor(b2b.creditLimitMinor / 100)} TL`;
    }
  } else if (b2b.reason && customerId) {
    hint = b2b.reason;
  }

  return {
    ...base,
    openAccount: {
      enabled: b2b.eligible,
      paymentTermDays: b2b.paymentTermDays,
      availableCreditMinor: b2b.availableCreditMinor,
      creditLimitMinor: b2b.creditLimitMinor,
      groupName: b2b.groupName,
      hint,
    },
  };
}
