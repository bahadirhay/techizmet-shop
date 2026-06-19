import "server-only";

import { prisma } from "@/lib/prisma";

export type CustomerCounterpartyPrefill = {
  id: string;
  label: string;
  title: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  taxOffice: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  hasCounterparty: boolean;
  counterpartyId: string | null;
};

function customerLabel(c: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name && c.email) return `${name} · ${c.email}`;
  return name || c.email || c.phone || "Üye";
}

function parseRecipientTaxId(invoiceMetaJson: string | null): string | null {
  if (!invoiceMetaJson?.trim()) return null;
  try {
    const meta = JSON.parse(invoiceMetaJson) as { recipientTaxId?: string };
    const id = meta.recipientTaxId?.trim();
    return id || null;
  } catch {
    return null;
  }
}

async function latestTaxIdForCustomer(siteId: string, customerId: string): Promise<string | null> {
  const order = await prisma.storeOrder.findFirst({
    where: { siteId, customerId, invoiceMetaJson: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { invoiceMetaJson: true },
  });
  return parseRecipientTaxId(order?.invoiceMetaJson ?? null);
}

export async function buildCustomerCounterpartyPrefill(
  siteId: string,
  customerId: string,
): Promise<CustomerCounterpartyPrefill | null> {
  const customer = await prisma.storeCustomer.findFirst({
    where: { id: customerId, siteId },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 1 },
      financeCounterparties: {
        where: { active: true },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!customer) return null;

  const addr = customer.addresses[0];
  const taxId =
    customer.taxId?.trim() ||
    (await latestTaxIdForCustomer(siteId, customer.id));
  const title =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.email ||
    "Site üyesi";

  return {
    id: customer.id,
    label: customerLabel(customer),
    title,
    email: customer.email,
    phone: customer.phone ?? addr?.phone ?? null,
    taxId,
    taxOffice: null,
    addressLine: addr?.line1 ?? null,
    city: addr?.city ?? null,
    district: addr?.district ?? null,
    hasCounterparty: customer.financeCounterparties.length > 0,
    counterpartyId: customer.financeCounterparties[0]?.id ?? null,
  };
}

export async function searchCustomersForCounterparty(
  siteId: string,
  query: string,
  limit = 20,
): Promise<CustomerCounterpartyPrefill[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await prisma.storeCustomer.findMany({
    where: {
      siteId,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(limit, 30),
    select: { id: true },
  });

  const out: CustomerCounterpartyPrefill[] = [];
  for (const row of rows) {
    const prefill = await buildCustomerCounterpartyPrefill(siteId, row.id);
    if (prefill) out.push(prefill);
  }
  return out;
}
