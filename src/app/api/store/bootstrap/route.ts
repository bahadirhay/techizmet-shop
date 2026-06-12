import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getStoreLocale } from "@/lib/i18n/server";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureStoreTenant();
  const locale = await getStoreLocale();
  const site = await getDefaultSite();
  const nav = await loadMirrorNavItems(site.id, locale);
  const session = await getCustomerSession();

  let customer: {
    email: string;
    id: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null = null;

  if (session.isLoggedIn && session.email && session.customerId) {
    const row = await prisma.storeCustomer.findFirst({
      where: { id: session.customerId, siteId: site.id },
      select: { email: true, firstName: true, lastName: true },
    });
    if (row) {
      customer = {
        email: row.email ?? session.email,
        id: session.customerId,
        firstName: row.firstName,
        lastName: row.lastName,
      };
    }
  }

  return NextResponse.json({
    locale,
    nav,
    customer,
  });
}
