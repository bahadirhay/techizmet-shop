import type { StoreEventType } from "@/lib/analytics/types";

export const EVENT_LABELS: Record<StoreEventType, string> = {
  page_view: "Sayfa görüntüleme",
  product_view: "Ürün görüntüleme",
  search_query: "Site araması",
  add_to_cart: "Sepete ekleme",
  remove_from_cart: "Sepetten çıkarma",
  begin_checkout: "Ödeme başlangıcı",
  purchase: "Satın alma",
};

export function parseEventPayload(payloadJson: string): Record<string, unknown> {
  if (!payloadJson?.trim()) return {};
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Admin tablo / zaman çizelgesi — okunabilir detay */
export function formatEventDetail(eventType: string, payloadJson: string): string {
  const p = parseEventPayload(payloadJson);

  switch (eventType) {
    case "page_view": {
      const path = String(p.path ?? "").trim();
      return path || "—";
    }
    case "product_view": {
      const slug = String(p.slug ?? "").trim();
      const title = String(p.title ?? "").trim();
      if (title && slug) return `${title} (${slug})`;
      return slug || title || "—";
    }
    case "search_query": {
      const query = String(p.query ?? "").trim();
      const source = String(p.source ?? "").trim();
      const count = Number(p.resultCount);
      const parts = [query || "—"];
      if (source) parts.push(`(${source})`);
      if (Number.isFinite(count) && count >= 0) parts.push(`→ ${count} sonuç`);
      return parts.join(" ");
    }
    case "add_to_cart": {
      const title = String(p.title ?? "").trim();
      const qty = Number(p.qty) || 1;
      return title ? `${title} ×${qty}` : `Ürün ×${qty}`;
    }
    case "remove_from_cart": {
      const title = String(p.title ?? "").trim();
      return title || "Ürün kaldırıldı";
    }
    case "begin_checkout": {
      const minor = Number(p.cartValueMinor);
      const count = Number(p.itemCount);
      if (Number.isFinite(minor) && minor > 0) {
        return `${count || "?"} ürün`;
      }
      return "Ödeme adımı";
    }
    case "purchase": {
      const num = String(p.orderNumber ?? p.orderId ?? "").trim();
      return num ? `Sipariş ${num}` : "Satın alma";
    }
    default:
      return "—";
  }
}

export type CartLinePreview = { title: string; qty: number; slug?: string };

export function parseCartItemsJson(itemsJson: string): CartLinePreview[] {
  if (!itemsJson?.trim()) return [];
  try {
    const raw = JSON.parse(itemsJson) as Array<{ title?: string; slug?: string; qty?: number }>;
    if (!Array.isArray(raw)) return [];
    return raw.map((i) => ({
      title: i.title?.trim() || "Ürün",
      qty: Math.max(1, Number(i.qty) || 1),
      slug: i.slug?.trim() || undefined,
    }));
  } catch {
    return [];
  }
}

export function formatCartItemsPreview(itemsJson: string, max = 3): string {
  const items = parseCartItemsJson(itemsJson);
  if (!items.length) return "—";
  const head = items.slice(0, max).map((i) => `${i.title}${i.qty > 1 ? ` ×${i.qty}` : ""}`);
  const more = items.length > max ? ` +${items.length - max}` : "";
  return head.join(", ") + more;
}
