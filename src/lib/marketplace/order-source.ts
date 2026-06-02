import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import type { Prisma } from "@prisma/client";

export function orderSourceLabel(order: {
  marketplacePlatform?: string | null;
  paymentMethod?: string | null;
}): string {
  if (order.marketplacePlatform) {
    return (
      MARKETPLACE_PLATFORMS.find((p) => p.id === order.marketplacePlatform)?.label ??
      order.marketplacePlatform
    );
  }
  if (order.paymentMethod === "marketplace") return "Pazaryeri";
  return "Web sitesi";
}

export function orderSourceId(platform: string | null | undefined): string {
  return platform ?? "web";
}

export function orderSourceLabelById(sourceId: string): string {
  if (sourceId === "web") return "Web sitesi";
  return MARKETPLACE_PLATFORMS.find((p) => p.id === sourceId)?.label ?? sourceId;
}

export function orderSourceBadgeClass(platform: string | null | undefined): string {
  if (!platform) return "bg-zinc-100 text-zinc-700";
  if (platform === "trendyol") return "bg-orange-100 text-orange-900";
  if (platform === "hepsiburada") return "bg-orange-50 text-orange-800";
  if (platform === "amazon_tr") return "bg-amber-100 text-amber-900";
  if (platform === "n11") return "bg-purple-100 text-purple-900";
  return "bg-blue-100 text-blue-900";
}

/** Sipariş listesi filtresi: web | marketplace | trendyol | hepsiburada | ... */
export function orderSourcePrismaFilter(
  source: string | undefined,
): Prisma.StoreOrderWhereInput {
  if (!source || source === "all") return {};
  if (source === "web") return { marketplacePlatform: null };
  if (source === "marketplace") return { marketplacePlatform: { not: null } };
  return { marketplacePlatform: source };
}

export function ordersListHref(params: {
  status?: string;
  source?: string;
  invoice?: "pending";
}): string {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.source && params.source !== "all") q.set("source", params.source);
  if (params.invoice === "pending") q.set("invoice", "pending");
  const s = q.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export const ORDER_SOURCE_FILTERS = [
  { id: "all", label: "Tüm kaynaklar" },
  { id: "web", label: "Web sitesi" },
  { id: "marketplace", label: "Tüm pazaryeri" },
  ...MARKETPLACE_PLATFORMS.map((p) => ({ id: p.id, label: p.label })),
] as const;
