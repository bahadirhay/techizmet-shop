/** Ürün paylaşım URL’leri — istemci + sunucu */

export type ProductSharePayload = {
  slug: string;
  title: string;
  priceLabel: string;
  imageUrl: string | null;
};

export function productSharePageUrl(slug: string, origin?: string): string {
  const base = (origin ?? "").replace(/\/$/, "");
  return `${base}/products/${encodeURIComponent(slug)}`;
}

export function productShareMessage(title: string, priceLabel: string, url: string): string {
  const parts = [title.trim()];
  if (priceLabel.trim()) parts.push(priceLabel.trim());
  parts.push(url);
  return parts.filter(Boolean).join("\n");
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function facebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}
