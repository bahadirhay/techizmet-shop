import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { MirrorAccountFrame } from "@/components/store/MirrorAccountFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { accountLoginPath } from "@/lib/account-return-path";
import { AccountDashboard } from "@/components/store/AccountDashboard";
import {
  canRequestCancel,
  canRequestRefund,
} from "@/lib/orders/customer-requests";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders/public-order";
import { getCustomerSession } from "@/lib/customer-session";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { getStoreLocale } from "@/lib/i18n/server";
import { ACCOUNT_DASHBOARD_BRIDGE_JS } from "@/lib/mirror-account-dashboard";
import { resolveThemeShellAccountDashboardContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId) {
    redirect(accountLoginPath("/account"));
  }

  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const query = await searchParams;
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/account", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const content = await resolveThemeShellAccountDashboardContent(session.customerId, locale);
    if (!content) notFound();
    return (
      <ThemeShellCommerceView
        content={content}
        bridgeScripts={[ACCOUNT_DASHBOARD_BRIDGE_JS]}
      />
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorAccountFrame />;
  }

  const customer = await prisma.storeCustomer.findUnique({
    where: { id: session.customerId },
    include: {
      customerGroup: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { carrier: true },
      },
      favorites: {
        include: { product: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) redirect(accountLoginPath("/account"));

  const favorites = customer.favorites
    .filter((f) => f.product.siteId === site.id && f.product.published)
    .map((f) => ({
      productId: f.product.id,
      slug: f.product.slug,
      title: f.product.title,
      imageUrl: f.product.imageUrl,
      priceMinor: f.product.priceMinor,
    }));

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Müşteri";

  return (
    <div className="kn-section">
      <AccountDashboard
        name={name ?? "Müşteri"}
        email={customer.email}
        memberGroup={
          customer.customerGroup?.active
            ? { name: customer.customerGroup.name, discountPercent: customer.customerGroup.discountPercent }
            : null
        }
        initialProfile={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        }}
        initialAddresses={customer.addresses}
        initialOrders={customer.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          statusLabel: orderStatusLabel(o.status),
          paymentStatusLabel: paymentStatusLabel(o.paymentStatus),
          paymentMethodLabel: paymentMethodLabel(o.paymentMethod),
          createdAt: o.createdAt.toISOString(),
          trackingNumber: o.trackingNumber,
          carrierName: o.carrier?.name ?? null,
          totalMinor: o.totalMinor,
          canCancel: canRequestCancel(o.status),
          canRefund: canRequestRefund(o.status),
        }))}
        initialFavorites={favorites}
      />
    </div>
  );
}
