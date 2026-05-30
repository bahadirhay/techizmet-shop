import { orderSourceLabel } from "@/lib/marketplace/order-source";

export type ShippingAddress = {
  line1?: string;
  line2?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

export type ShipFromAddress = {
  name: string;
  line1: string;
  line2?: string;
  district: string;
  city: string;
  postalCode: string;
  phone: string;
};

export type ShippingLabelData = {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  sourceLabel: string;
  isMarketplace: boolean;
  customerName: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddress;
  carrierName: string | null;
  trackingNumber: string | null;
  paymentMethod: string | null;
  itemCount: number;
  itemSummary: string;
  totalPieces: number;
  notes: string | null;
};

export function parseShippingAddress(raw: string | null): ShippingAddress {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as ShippingAddress;
  } catch {
    return {};
  }
}

export function formatShippingAddressLines(addr: ShippingAddress): string[] {
  const lines: string[] = [];
  if (addr.line1?.trim()) lines.push(addr.line1.trim());
  if (addr.line2?.trim()) lines.push(addr.line2.trim());
  const cityLine = [addr.district, addr.city].filter(Boolean).join(" / ");
  if (cityLine) lines.push(cityLine);
  if (addr.postalCode?.trim()) lines.push(addr.postalCode.trim());
  if (addr.country?.trim() && addr.country !== "TR") lines.push(addr.country.trim());
  return lines;
}

export function formatShipFromLines(from: ShipFromAddress): string[] {
  const lines: string[] = [];
  if (from.line1.trim()) lines.push(from.line1.trim());
  if (from.line2?.trim()) lines.push(from.line2.trim());
  const cityLine = [from.district, from.city].filter(Boolean).join(" / ");
  if (cityLine) lines.push(cityLine);
  if (from.postalCode.trim()) lines.push(from.postalCode.trim());
  if (from.phone.trim()) lines.push(`Tel: ${from.phone.trim()}`);
  return lines;
}

export function defaultShipFrom(storeName: string): ShipFromAddress {
  return {
    name: storeName,
    line1: "",
    district: "",
    city: "",
    postalCode: "",
    phone: "",
  };
}

export function paymentMethodShort(method: string | null): string {
  if (method === "cod") return "Kapıda ödeme";
  if (method === "bank_transfer" || method === "bank") return "Havale";
  if (method === "card") return "Kredi kartı";
  if (method === "marketplace") return "Pazaryeri";
  return method ?? "—";
}

export function buildItemSummary(lines: { title: string; qty: number }[]): {
  itemCount: number;
  itemSummary: string;
  totalPieces: number;
} {
  const itemCount = lines.length;
  const totalPieces = lines.reduce((s, l) => s + l.qty, 0);
  const preview = lines
    .slice(0, 3)
    .map((l) => `${l.qty}× ${l.title.slice(0, 36)}${l.title.length > 36 ? "…" : ""}`)
    .join(" · ");
  const extra = itemCount > 3 ? ` (+${itemCount - 3} kalem)` : "";
  return { itemCount, itemSummary: preview + extra, totalPieces };
}

export function toShippingLabelData(order: {
  id: string;
  orderNumber: string;
  createdAt: Date;
  marketplacePlatform: string | null;
  customerName: string | null;
  customerPhone: string | null;
  shippingAddressJson: string | null;
  trackingNumber: string | null;
  paymentMethod: string | null;
  adminNotes: string | null;
  carrier?: { name: string } | null;
  lines: { title: string; qty: number }[];
}): ShippingLabelData {
  const { itemCount, itemSummary, totalPieces } = buildItemSummary(order.lines);
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt.toLocaleDateString("tr-TR"),
    sourceLabel: orderSourceLabel(order),
    isMarketplace: Boolean(order.marketplacePlatform),
    customerName: order.customerName?.trim() || "Müşteri",
    customerPhone: order.customerPhone,
    shippingAddress: parseShippingAddress(order.shippingAddressJson),
    carrierName: order.carrier?.name ?? null,
    trackingNumber: order.trackingNumber,
    paymentMethod: order.paymentMethod,
    itemCount,
    itemSummary,
    totalPieces,
    notes: order.adminNotes,
  };
}
