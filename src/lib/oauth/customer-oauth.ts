import "server-only";

import { setCustomerSession } from "@/lib/customer-auth";
import { linkVisitorToCustomer } from "@/lib/analytics/visitor";
import { VISITOR_COOKIE } from "@/lib/analytics/visitor-cookie";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function findOrCreateOAuthCustomer(params: {
  siteId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  googleSub?: string | null;
  appleSub?: string | null;
}) {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error("E-posta gerekli");

  let customer =
    (params.googleSub
      ? await prisma.storeCustomer.findFirst({
          where: { siteId: params.siteId, googleSub: params.googleSub },
        })
      : null) ??
    (params.appleSub
      ? await prisma.storeCustomer.findFirst({
          where: { siteId: params.siteId, appleSub: params.appleSub },
        })
      : null) ??
    (await prisma.storeCustomer.findFirst({
      where: { siteId: params.siteId, email },
    }));

  if (customer) {
    customer = await prisma.storeCustomer.update({
      where: { id: customer.id },
      data: {
        email,
        firstName: params.firstName ?? customer.firstName,
        lastName: params.lastName ?? customer.lastName,
        googleSub: params.googleSub ?? customer.googleSub,
        appleSub: params.appleSub ?? customer.appleSub,
      },
    });
  } else {
    customer = await prisma.storeCustomer.create({
      data: {
        siteId: params.siteId,
        email,
        firstName: params.firstName ?? null,
        lastName: params.lastName ?? null,
        googleSub: params.googleSub ?? null,
        appleSub: params.appleSub ?? null,
      },
    });
  }

  await completeOAuthLogin(params.siteId, customer.id, email);
  return customer;
}

export async function completeOAuthLogin(siteId: string, customerId: string, email: string) {
  await setCustomerSession(customerId, email, siteId);
  const jar = await cookies();
  const visitorKey = jar.get(VISITOR_COOKIE)?.value?.trim();
  if (visitorKey) {
    await linkVisitorToCustomer(siteId, visitorKey, customerId);
  }
}
