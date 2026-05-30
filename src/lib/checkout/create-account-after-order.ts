import {
  hashCustomerPassword,
  setCustomerSession,
} from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export async function createAccountAfterOrder(params: {
  siteId: string;
  customerId: string | null;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    city: string;
    district: string;
    line1: string;
    postalCode?: string;
  };
}): Promise<{ ok: boolean; error?: string; loggedIn?: boolean }> {
  const email = params.email.trim().toLowerCase();
  if (!email || params.password.length < 6) {
    return { ok: false, error: "E-posta ve en az 6 karakterli şifre gerekli" };
  }

  const hash = await hashCustomerPassword(params.password);

  let customerId = params.customerId;

  if (customerId) {
    const row = await prisma.storeCustomer.findFirst({
      where: { id: customerId, siteId: params.siteId },
    });
    if (!row) customerId = null;
    else if (row.passwordHash) {
      return { ok: false, error: "Bu e-posta zaten kayıtlı. Giriş yapın." };
    }
  }

  if (!customerId) {
    const existing = await prisma.storeCustomer.findFirst({
      where: { siteId: params.siteId, email },
    });
    if (existing?.passwordHash) {
      return { ok: false, error: "Bu e-posta zaten kayıtlı. Giriş yapın." };
    }
    if (existing) {
      customerId = existing.id;
    }
  }

  const customer = customerId
    ? await prisma.storeCustomer.update({
        where: { id: customerId },
        data: {
          passwordHash: hash,
          firstName: params.firstName || undefined,
          lastName: params.lastName || undefined,
          phone: params.phone || undefined,
        },
      })
    : await prisma.storeCustomer.create({
        data: {
          siteId: params.siteId,
          email,
          passwordHash: hash,
          firstName: params.firstName || null,
          lastName: params.lastName || null,
          phone: params.phone || null,
        },
      });

  const addrCount = await prisma.customerAddress.count({
    where: { customerId: customer.id },
  });

  if (params.address.city && params.address.line1) {
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "Teslimat",
        firstName: params.firstName || null,
        lastName: params.lastName || null,
        phone: params.phone || null,
        city: params.address.city,
        district: params.address.district,
        line1: params.address.line1,
        postalCode: params.address.postalCode ?? null,
        isDefault: addrCount === 0,
      },
    });
  }

  await setCustomerSession(customer.id, email, params.siteId);
  return { ok: true, loggedIn: true };
}
