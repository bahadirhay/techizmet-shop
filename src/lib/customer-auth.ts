import bcrypt from "bcryptjs";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";

export async function loadCustomerSession(customerId: string, siteId: string) {
  const customer = await prisma.storeCustomer.findFirst({
    where: { id: customerId, siteId },
    select: { id: true, email: true, siteId: true, passwordHash: true },
  });
  if (!customer?.passwordHash) return null;
  return customer;
}

export async function setCustomerSession(customerId: string, email: string, siteId: string) {
  const session = await getCustomerSession();
  session.isLoggedIn = true;
  session.customerId = customerId;
  session.email = email;
  session.siteId = siteId;
  await session.save();
}

export async function clearCustomerSession() {
  const session = await getCustomerSession();
  session.destroy();
}

export async function hashCustomerPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyCustomerPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
