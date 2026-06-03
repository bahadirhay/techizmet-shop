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

/** Instagram’da doğrudan ürün linki paylaşımı yok — kopyalama + uygulama */
export function instagramShareHint(): string {
  return "Link kopyalandı. Instagram’da hikaye veya gönderiye yapıştırın.";
}

export function tikTokShareHint(): string {
  return "Link kopyalandı. TikTok’ta biyografi veya videoya ekleyebilirsiniz.";
}

export function youTubeShareHint(): string {
  return "Link kopyalandı. YouTube açıklamasına veya topluluğa yapıştırın.";
}
