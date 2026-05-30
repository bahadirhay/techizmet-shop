import type { SiteSettings } from "@/lib/site-settings";

const DEFAULT_PREFIX = "KN";

/** Sipariş no öneki — yalnızca harf/rakam, büyük harf */
export function sanitizeOrderNumberPrefix(raw: string | undefined | null): string {
  const cleaned = (raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return cleaned || DEFAULT_PREFIX;
}

export function resolveOrderNumberPrefix(
  settings: SiteSettings | null | undefined,
  groupPrefix?: string | null,
): string {
  const fromGroup = groupPrefix?.trim();
  if (fromGroup) return sanitizeOrderNumberPrefix(fromGroup);
  return sanitizeOrderNumberPrefix(settings?.store?.orderNumberPrefix);
}

export function generateOrderNumber(prefix?: string): string {
  const p = sanitizeOrderNumberPrefix(prefix);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${p}-${ymd}-${rand}`;
}

export function orderNumberPreview(prefix: string): string {
  const p = sanitizeOrderNumberPrefix(prefix);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${p}-${ymd}-XXXXXX`;
}
