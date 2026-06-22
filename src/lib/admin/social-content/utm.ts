import type { SocialPlatform } from "@/lib/admin/social-content/types";

export function productUtmUrl(productUrl: string, platform: SocialPlatform, productSlug: string): string {
  try {
    const url = new URL(productUrl);
    url.searchParams.set("utm_source", platform);
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", `product-${productSlug}`);
    return url.toString();
  } catch {
    return productUrl;
  }
}
