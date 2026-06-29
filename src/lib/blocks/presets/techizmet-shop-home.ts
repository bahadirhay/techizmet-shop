import type { ShopBlock } from "@/lib/blocks/schema";
import type { ShopLocale } from "@/lib/i18n/locale";

/**
 * Fallback preset — admin henüz home bloklarını yapılandırmadığında gösterilir.
 * Yalnızca DB'den gelen gerçek ürünleri render eden bloklardan oluşur;
 * kozmetik görsel veya koleksiyon referansı içermez.
 */
export function buildStoreHomePreset(locale: ShopLocale): ShopBlock[] {
  const isEn = locale === "en";

  return [
    {
      type: "announcementBar",
      props: {
        text: isEn ? "Free shipping on orders over ₺300" : "300 TL üzeri siparişlerde ücretsiz kargo",
        linkLabel: isEn ? "Shop now" : "Alışverişe başla",
        linkHref: "/collections/all",
      },
    },
    {
      type: "productGrid",
      props: {
        title: isEn ? "Featured products" : "Öne çıkan ürünler",
        limit: 8,
      },
    },
    {
      type: "productGrid",
      props: {
        title: isEn ? "All products" : "Tüm ürünler",
        limit: 8,
        collectionSlug: "all",
      },
    },
    {
      type: "newsletter",
      props: {
        title: isEn ? "Join our newsletter" : "Bültene katılın",
        subtitle: isEn
          ? "Be first to know about new products and offers."
          : "Kampanya ve yeni ürünlerden ilk siz haberdar olun.",
        buttonLabel: isEn ? "Subscribe" : "Kaydol",
      },
    },
  ];
}

/** Geriye dönük import */
export const storeHomePreset = buildStoreHomePreset("tr");
