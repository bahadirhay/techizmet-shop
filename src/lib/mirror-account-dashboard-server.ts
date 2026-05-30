import "server-only";

import {
  canRequestCancel,
  canRequestRefund,
} from "@/lib/orders/customer-requests";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders/public-order";
import { formatTry } from "@/lib/format";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  buildAccountDashboardMarkup,
  buildAccountWelcomeHtml,
  injectAccountDashboardBridge,
  injectAccountDashboardIntoMirrorHtml,
  injectAccountWelcomeBanner,
  type MirrorAccountDashboardPayload,
} from "@/lib/mirror-account-dashboard";
import { prisma } from "@/lib/prisma";

export async function loadMirrorAccountDashboardPayload(
  customerId: string,
  locale: ShopLocale,
): Promise<MirrorAccountDashboardPayload | null> {
  const customer = await prisma.storeCustomer.findUnique({
    where: { id: customerId },
    include: {
      customerGroup: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { carrier: true },
      },
    },
  });
  if (!customer) return null;

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    (locale === "tr" ? "Müşteri" : "Customer");

  return {
    name,
    email: customer.email ?? "",
    memberGroup:
      customer.customerGroup?.active
        ? {
            name: customer.customerGroup.name,
            discountPercent: customer.customerGroup.discountPercent,
          }
        : null,
    profile: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      city: a.city,
      district: a.district,
      line1: a.line1,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    })),
    orders: customer.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      statusLabel: orderStatusLabel(o.status),
      paymentStatusLabel: paymentStatusLabel(o.paymentStatus),
      paymentMethodLabel: paymentMethodLabel(o.paymentMethod),
      createdAt: o.createdAt.toISOString(),
      trackingNumber: o.trackingNumber,
      carrierName: o.carrier?.name ?? null,
      totalLabel: formatTry(o.totalMinor),
      canCancel: canRequestCancel(o.status),
      canRefund: canRequestRefund(o.status),
    })),
    locale,
  };
}

export function applyAccountDashboardToMirrorHtml(
  html: string,
  payload: MirrorAccountDashboardPayload,
): string {
  let out = injectAccountWelcomeBanner(html, buildAccountWelcomeHtml(payload));
  const markup = buildAccountDashboardMarkup(payload);
  out = injectAccountDashboardIntoMirrorHtml(out, markup);
  out = injectAccountDashboardBridge(out);
  return out;
}
