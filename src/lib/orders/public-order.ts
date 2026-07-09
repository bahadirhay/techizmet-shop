import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { formatTry } from "@/lib/admin/money";
import { parseComponentsSnapshotJson, PRODUCT_KIND_BUNDLE } from "@/lib/product-bundle";

export function orderStatusLabel(status: string) {
  return ORDER_STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function paymentStatusLabel(status: string) {
  if (status === "paid") return "Ödendi";
  if (status === "pending") return "Beklemede";
  if (status === "failed") return "Başarısız";
  if (status === "unpaid") return "Ödenmedi";
  if (status === "open_account") return "Açık hesap";
  return status;
}

export function paymentStatusAdminLabel(
  paymentMethod: string | null,
  paymentStatus: string,
): string {
  if (paymentMethod === "card") {
    if (paymentStatus === "paid") return "Kart — ödendi";
    if (paymentStatus === "failed") return "Kart — başarısız";
    return "Kart — ödeme bekleniyor";
  }
  return paymentMethodLabel(paymentMethod);
}

export function paymentMethodLabel(method: string | null) {
  if (method === "cod") return "Kapıda ödeme";
  if (method === "bank_transfer") return "Havale / EFT";
  if (method === "card") return "Kredi kartı";
  return method ?? "—";
}

export type PublicOrderView = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  customerName: string | null;
  createdAt: string;
  trackingNumber: string | null;
  carrierName: string | null;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  totalMinor: number;
  totalFormatted: string;
  lines: {
    title: string;
    qty: number;
    lineMinor: number;
    lineFormatted: string;
    isBundle?: boolean;
    components?: { title: string; qty: number }[];
  }[];
  shippingAddress: { city?: string; district?: string; line1?: string; postalCode?: string } | null;
};

export function toPublicOrderView(order: {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  customerName: string | null;
  createdAt: Date;
  trackingNumber: string | null;
  carrier?: { name: string } | null;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  totalMinor: number;
  shippingAddressJson: string | null;
  lines: {
    title: string;
    qty: number;
    lineMinor: number;
    lineKind?: string | null;
    componentsSnapshotJson?: string | null;
  }[];
}): PublicOrderView {
  let shippingAddress: PublicOrderView["shippingAddress"] = null;
  if (order.shippingAddressJson) {
    try {
      shippingAddress = JSON.parse(order.shippingAddressJson) as PublicOrderView["shippingAddress"];
    } catch {
      shippingAddress = null;
    }
  }
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    paymentStatus: order.paymentStatus,
    paymentStatusLabel: paymentStatusLabel(order.paymentStatus),
    paymentMethod: order.paymentMethod ?? "",
    paymentMethodLabel: paymentMethodLabel(order.paymentMethod),
    customerName: order.customerName,
    createdAt: order.createdAt.toISOString(),
    trackingNumber: order.trackingNumber,
    carrierName: order.carrier?.name ?? null,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    discountMinor: order.discountMinor,
    totalMinor: order.totalMinor,
    totalFormatted: formatTry(order.totalMinor),
    lines: order.lines.map((l) => {
      const isBundle = l.lineKind === PRODUCT_KIND_BUNDLE;
      const components = isBundle
        ? parseComponentsSnapshotJson(l.componentsSnapshotJson).map((c) => ({
            title: c.title,
            qty: c.qty,
          }))
        : undefined;
      return {
        title: l.title,
        qty: l.qty,
        lineMinor: l.lineMinor,
        lineFormatted: formatTry(l.lineMinor),
        isBundle,
        components,
      };
    }),
    shippingAddress,
  };
}
