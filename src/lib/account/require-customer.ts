import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";

export async function requireCustomerApi() {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId || !session.siteId) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }
  const customer = await prisma.storeCustomer.findFirst({
    where: { id: session.customerId, siteId: session.siteId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Hesap bulunamadı" }, { status: 401 });
  }
  return { customer, siteId: session.siteId };
}
