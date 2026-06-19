import "server-only";

import { loadCariCounterpartyDetail } from "@/lib/finance/cari-ledger";
import { prisma } from "@/lib/prisma";

export type B2bOpenAccountEligibility = {
  eligible: boolean;
  reason?: string;
  paymentTermDays: number | null;
  creditLimitMinor: number | null;
  openExposureMinor: number;
  availableCreditMinor: number | null;
  creditHold: boolean;
  groupName: string | null;
  counterpartyId: string | null;
};

function isB2bApproved(customer: {
  b2bStatus: string | null;
  customerGroup: { isB2b: boolean; active: boolean } | null;
}): boolean {
  if (customer.b2bStatus === "pending" || customer.b2bStatus === "rejected") return false;
  if (customer.b2bStatus === "approved") return true;
  // Admin elle B2B grubu atadıysa (eski kayıtlar)
  return Boolean(customer.customerGroup?.active && customer.customerGroup.isB2b);
}

export async function getB2bOpenAccountEligibility(
  siteId: string,
  customerId: string | null | undefined,
): Promise<B2bOpenAccountEligibility> {
  const empty: B2bOpenAccountEligibility = {
    eligible: false,
    paymentTermDays: null,
    creditLimitMinor: null,
    openExposureMinor: 0,
    availableCreditMinor: null,
    creditHold: false,
    groupName: null,
    counterpartyId: null,
  };
  if (!customerId) return empty;

  const customer = await prisma.storeCustomer.findFirst({
    where: { id: customerId, siteId },
    include: { customerGroup: true },
  });
  if (!customer || !isB2bApproved(customer)) {
    return { ...empty, reason: "Onaylı B2B üyeliği gerekli" };
  }

  const counterparty = await prisma.financeCounterparty.findFirst({
    where: { siteId, customerId, active: true },
    select: {
      id: true,
      openAccountEnabled: true,
      paymentTermDays: true,
      creditLimitMinor: true,
      creditHold: true,
    },
  });

  const group = customer.customerGroup;
  const openEnabled =
    counterparty?.openAccountEnabled || (group?.active && group.openAccountEnabled);
  if (!openEnabled) {
    return {
      ...empty,
      groupName: group?.name ?? null,
      counterpartyId: counterparty?.id ?? null,
      reason: "Bu hesap için açık hesap tanımlı değil",
    };
  }

  if (counterparty?.creditHold) {
    return {
      ...empty,
      groupName: group?.name ?? null,
      counterpartyId: counterparty.id,
      creditHold: true,
      reason: "Cari risk kilidi aktif — sipariş verilemez",
    };
  }

  const paymentTermDays =
    counterparty?.paymentTermDays ?? group?.defaultPaymentTermDays ?? null;
  const creditLimitMinor =
    counterparty?.creditLimitMinor ?? group?.defaultCreditLimitMinor ?? null;

  let openExposureMinor = 0;
  if (counterparty?.id) {
    const detail = await loadCariCounterpartyDetail(siteId, counterparty.id);
    openExposureMinor = detail?.receivableMinor ?? 0;
  }

  const availableCreditMinor =
    creditLimitMinor != null ? Math.max(0, creditLimitMinor - openExposureMinor) : null;

  return {
    eligible: true,
    paymentTermDays,
    creditLimitMinor,
    openExposureMinor,
    availableCreditMinor,
    creditHold: false,
    groupName: group?.name ?? null,
    counterpartyId: counterparty?.id ?? null,
  };
}

export async function assertOpenAccountCredit(
  siteId: string,
  customerId: string,
  orderTotalMinor: number,
): Promise<void> {
  const el = await getB2bOpenAccountEligibility(siteId, customerId);
  if (!el.eligible) {
    throw new Error(el.reason ?? "Açık hesap kullanılamıyor");
  }
  if (el.creditLimitMinor != null && orderTotalMinor > (el.availableCreditMinor ?? 0)) {
    throw new Error(
      `Cari risk limiti aşılıyor. Kullanılabilir limit: ${Math.floor((el.availableCreditMinor ?? 0) / 100)} TL`,
    );
  }
}

export function groupDefaultsForCounterparty(group: {
  isB2b: boolean;
  openAccountEnabled: boolean;
  defaultPaymentTermDays: number | null;
  defaultCreditLimitMinor: number | null;
  name: string;
}) {
  return {
    openAccountEnabled: group.openAccountEnabled,
    paymentTermDays: group.defaultPaymentTermDays,
    creditLimitMinor: group.defaultCreditLimitMinor,
    tags: group.isB2b ? `B2B,${group.name}` : group.name,
    preferredPaymentMethod: group.openAccountEnabled ? "open_account" : null,
  };
}
