import "server-only";

import { normalizeConsumerTaxId } from "@/lib/efatura/consumer-tax-id";
import { prisma } from "@/lib/prisma";

export type EnsureCounterpartyInput = {
  siteId: string;
  customerId: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  taxOffice?: string | null;
  addressLine?: string | null;
  city?: string | null;
  district?: string | null;
  /** Onaylı B2B — grup varsayılanları cari kartına kopyalanır */
  groupDefaults?: {
    openAccountEnabled?: boolean;
    paymentTermDays?: number | null;
    creditLimitMinor?: number | null;
    tags?: string | null;
    preferredPaymentMethod?: string | null;
  };
  /** Mevcut cari kartında bu alanları güncelle (sipariş sonrası) */
  syncContactFields?: boolean;
};

function mergeTags(existing: string | null | undefined, extra: string | null | undefined): string | null {
  const parts = new Set<string>();
  for (const raw of [existing, extra]) {
    if (!raw?.trim()) continue;
    for (const t of raw.split(",")) {
      const s = t.trim();
      if (s) parts.add(s);
    }
  }
  return parts.size ? [...parts].join(", ") : null;
}

/**
 * Site üyesi için cari kartı yoksa oluşturur; varsa iletişim/fatura alanlarını günceller.
 */
export async function ensureSiteMemberCounterparty(
  input: EnsureCounterpartyInput,
): Promise<string | null> {
  const existing = await prisma.financeCounterparty.findFirst({
    where: { siteId: input.siteId, customerId: input.customerId, active: true },
    select: { id: true, taxId: true, tags: true },
  });

  const taxDigits = input.taxId?.replace(/\D/g, "") ?? "";
  const taxId =
    taxDigits.length === 10 || taxDigits.length === 11
      ? normalizeConsumerTaxId(input.taxId)
      : null;

  if (existing) {
    if (!input.syncContactFields && !input.groupDefaults) return existing.id;

    const data: Record<string, unknown> = {};
    if (input.syncContactFields) {
      if (input.title.trim()) data.title = input.title.trim();
      if (input.email?.trim()) data.email = input.email.trim();
      if (input.phone?.trim()) data.phone = input.phone.trim();
      if (input.taxOffice?.trim()) data.taxOffice = input.taxOffice.trim();
      if (input.addressLine?.trim()) data.addressLine = input.addressLine.trim();
      if (input.city?.trim()) data.city = input.city.trim();
      if (input.district?.trim()) data.district = input.district.trim();
      if (taxId && !existing.taxId) data.taxId = taxId;
    }
    if (input.groupDefaults) {
      if (input.groupDefaults.openAccountEnabled !== undefined) {
        data.openAccountEnabled = input.groupDefaults.openAccountEnabled;
      }
      if (input.groupDefaults.paymentTermDays != null) {
        data.paymentTermDays = input.groupDefaults.paymentTermDays;
      }
      if (input.groupDefaults.creditLimitMinor != null) {
        data.creditLimitMinor = input.groupDefaults.creditLimitMinor;
      }
      if (input.groupDefaults.preferredPaymentMethod) {
        data.preferredPaymentMethod = input.groupDefaults.preferredPaymentMethod;
      }
      const mergedTags = mergeTags(existing.tags, input.groupDefaults.tags);
      if (mergedTags) data.tags = mergedTags;
    }

    if (Object.keys(data).length) {
      await prisma.financeCounterparty.update({ where: { id: existing.id }, data });
    }
    return existing.id;
  }

  if (taxId) {
    const taxCollision = await prisma.financeCounterparty.findFirst({
      where: { siteId: input.siteId, taxId },
      select: { id: true, customerId: true },
    });
    if (taxCollision && taxCollision.customerId !== input.customerId) {
      // Başka caride aynı VKN — yine de müşteri carisi oluştur, VKN'siz
      return createCounterparty(input, null);
    }
  }

  return createCounterparty(input, taxId);
}

async function createCounterparty(
  input: EnsureCounterpartyInput,
  taxId: string | null,
): Promise<string> {
  const gd = input.groupDefaults;
  const row = await prisma.financeCounterparty.create({
    data: {
      siteId: input.siteId,
      type: "site_member",
      customerId: input.customerId,
      title: input.title.trim() || "Müşteri",
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      taxId,
      taxOffice: input.taxOffice?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      district: input.district?.trim() || null,
      openAccountEnabled: gd?.openAccountEnabled ?? false,
      paymentTermDays: gd?.paymentTermDays ?? null,
      creditLimitMinor: gd?.creditLimitMinor ?? null,
      preferredPaymentMethod: gd?.preferredPaymentMethod ?? null,
      tags: gd?.tags?.trim() || null,
    },
  });
  return row.id;
}

export type OrderCounterpartySnapshot = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingTaxId?: string | null;
  billingTaxOffice?: string | null;
  billingAddress?: {
    line1: string;
    city: string;
    district: string;
    firstName?: string;
    lastName?: string;
  };
};

/** Sipariş sonrası otomatik cari kartı */
export async function ensureCounterpartyAfterOrder(
  siteId: string,
  customerId: string | null,
  customer: OrderCounterpartySnapshot,
): Promise<void> {
  if (!customerId) return;

  const title =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.email ||
    "Müşteri";

  await ensureSiteMemberCounterparty({
    siteId,
    customerId,
    title,
    email: customer.email,
    phone: customer.phone,
    taxId: customer.billingTaxId,
    taxOffice: customer.billingTaxOffice,
    addressLine: customer.billingAddress?.line1,
    city: customer.billingAddress?.city,
    district: customer.billingAddress?.district,
    syncContactFields: true,
  });
}
