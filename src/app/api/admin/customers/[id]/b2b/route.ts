import { NextResponse } from "next/server";
import { groupDefaultsForCounterparty } from "@/lib/finance/b2b-credit";
import { ensureSiteMemberCounterparty } from "@/lib/finance/ensure-site-member-counterparty";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const customer = await prisma.storeCustomer.findFirst({
    where: { id, siteId: auth.siteId },
    include: { addresses: { take: 1, orderBy: [{ isDefault: "desc" }] } },
  });
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as {
    action?: "approve" | "reject";
    customerGroupId?: string;
    paymentTermDays?: number | null;
    creditLimitMinor?: number | null;
    openAccountEnabled?: boolean;
  };

  if (body.action === "reject") {
    await prisma.storeCustomer.update({
      where: { id },
      data: { b2bStatus: "rejected", customerGroupId: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "approve") {
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }

  const groupId = body.customerGroupId?.trim();
  if (!groupId) {
    return NextResponse.json({ error: "B2B müşteri grubu seçin" }, { status: 400 });
  }

  const group = await prisma.customerGroup.findFirst({
    where: { id: groupId, siteId: auth.siteId, active: true },
  });
  if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

  await prisma.storeCustomer.update({
    where: { id },
    data: {
      b2bStatus: "approved",
      customerGroupId: group.id,
      b2bApprovedAt: new Date(),
      b2bApprovedByStaffUserId: auth.staffUserId,
    },
  });

  const addr = customer.addresses[0];
  const title =
    customer.companyName?.trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.email ||
    "B2B müşteri";

  const groupDefaults = groupDefaultsForCounterparty(group);
  if (body.paymentTermDays != null) groupDefaults.paymentTermDays = body.paymentTermDays;
  if (body.creditLimitMinor != null) groupDefaults.creditLimitMinor = body.creditLimitMinor;
  if (body.openAccountEnabled !== undefined) {
    groupDefaults.openAccountEnabled = body.openAccountEnabled;
  }

  const counterpartyId = await ensureSiteMemberCounterparty({
    siteId: auth.siteId,
    customerId: id,
    title,
    email: customer.email,
    phone: customer.phone ?? addr?.phone,
    taxId: customer.taxId,
    taxOffice: customer.taxOffice,
    addressLine: addr?.line1,
    city: addr?.city,
    district: addr?.district,
    groupDefaults,
    syncContactFields: true,
  });

  return NextResponse.json({ ok: true, counterpartyId });
}
