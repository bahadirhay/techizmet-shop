import type { ShopBlock } from "@/lib/blocks/schema";
import type { ShopLocale } from "@/lib/i18n/locale";

/** Yeni mağaza — King Noor mirror içeriği yok, minimal blok ana sayfa */
export function buildEmptyStoreHomePreset(
  locale: ShopLocale,
  siteName = "Mağaza",
): ShopBlock[] {
  const tr = locale === "tr";
  return [
    {
      type: "heroSlider",
      props: {
        autoplayMs: 0,
        slides: [
          {
            id: "hero-1",
            headline: siteName,
            subline: tr
              ? "Hoş geldiniz. Ürünlerinizi panelden ekleyerek vitrini oluşturun."
              : "Welcome. Add products in the admin panel to build your storefront.",
            ctaLabel: tr ? "Ürünleri keşfet" : "Shop now",
            ctaHref: "/collections/all",
          },
        ],
      },
    },
    {
      type: "text",
      props: {
        as: "h2",
        align: "center",
        content: tr ? "Yakında burada" : "Coming soon",
      },
    },
    {
      type: "text",
      props: {
        align: "center",
        content: tr
          ? "Koleksiyonlar, kategoriler ve ürün görselleri yönetim panelinden eklenecek."
          : "Collections, categories, and product images will be added from the admin panel.",
      },
    },
    {
      type: "button",
      props: {
        align: "center",
        label: tr ? "Tüm ürünler" : "All products",
        href: "/collections/all",
        variant: "primary",
      },
    },
  ];
}
