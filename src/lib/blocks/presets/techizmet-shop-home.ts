import type { ShopBlock } from "@/lib/blocks/schema";
import type { ShopLocale } from "@/lib/i18n/locale";
import { nanoid } from "nanoid";

const id = () => nanoid(8);
const img = (file: string) => `/theme/techizmet-shop/cdn/shop/files/${file}`;
const col = (file: string) => `/theme/techizmet-shop/cdn/shop/collections/${file}`;

const copy = {
  tr: {
    announce: "300 TL üzeri siparişlerde ücretsiz kargo",
    announceLink: "Alışverişe başla",
    heroHead: "Hassas cilt için organik bakım",
    heroSub: "Nazik, etkili formüllerle doğal ışıltı.",
    heroCta: "Koleksiyonu keşfet",
    collTitle: "Cilt bakımı koleksiyonları",
    featured: "Öne çıkan ürünler",
    trending: "Trend ürünler",
    flash: "Flaş indirim — şimdi başladı",
    glowTitle: "Doğal ışıltı",
    glowBody: "Cildinizin doğal dengesini destekleyen temiz içerikli formüller.",
    glowCta: "Tümünü gör",
    testimonials: "Müşteri yorumları",
    marquee: "GLOW20 ile ekstra %20 indirim — Sınırlı süre",
    newsletterTitle: "Bültene katılın",
    newsletterSub: "Kampanya ve yeni ürünlerden ilk siz haberdar olun.",
    newsletterBtn: "Kaydol",
    bestSellers: "Çok satanlar",
  },
  en: {
    announce: "Free shipping on orders over $300",
    announceLink: "Shop now",
    heroHead: "Organic skincare for sensitive skin",
    heroSub: "Gentle, effective formulas for a natural glow.",
    heroCta: "Explore collection",
    collTitle: "Skincare collections",
    featured: "Featured products",
    trending: "Trending now",
    flash: "Flash sale — shop now",
    glowTitle: "Glow naturally",
    glowBody: "Clean ingredients that support your skin's natural balance.",
    glowCta: "View all",
    testimonials: "Customer love & feedback",
    marquee: "EXTRA 20% OFF WITH CODE: GLOW20",
    newsletterTitle: "Join our newsletter",
    newsletterSub: "Be first to know about new products and offers.",
    newsletterBtn: "Subscribe",
    bestSellers: "Best sellers",
  },
} as const;

export function buildStoreHomePreset(locale: ShopLocale): ShopBlock[] {
  const t = copy[locale];

  return [
    {
      type: "announcementBar",
      props: {
        text: t.announce,
        linkLabel: t.announceLink,
        linkHref: "/collections/all",
      },
    },
    {
      type: "heroSlider",
      props: {
        autoplayMs: 6000,
        slides: [
          {
            id: id(),
            headline: t.heroHead,
            subline: t.heroSub,
            ctaLabel: t.heroCta,
            ctaHref: "/collections/skincare",
            imageUrl: img("MG1_b0421d9f-5d83-4554-9ecb-3419c31cb87484b8.jpg"),
          },
          {
            id: id(),
            headline: "Techizmet Shop",
            subline: locale === "tr" ? "Premium cilt bakımı" : "Premium skincare",
            ctaLabel: t.glowCta,
            ctaHref: "/collections/glow-essentials",
            imageUrl: img("Glow_naturally_f788952b-80e5-4ed6-824b-242e15636c4a84b8.jpg"),
          },
        ],
      },
    },
    {
      type: "collectionGrid",
      props: {
        title: t.collTitle,
        items: [
          {
            id: id(),
            title: "Facial Boosters",
            href: "/collections/facial-boosters",
            productCount: 9,
            imageUrl: col("C1_f724e030-afa8-496c-b92d-d7fa3d66b864c950.jpg"),
          },
          {
            id: id(),
            title: "Glow Essentials",
            href: "/collections/glow-essentials",
            productCount: 9,
            imageUrl: col("C4_c1fc0c0f-4ea5-4cbd-b4b5-8926be8da150a30c.jpg"),
          },
          {
            id: id(),
            title: "Luxe Skincare",
            href: "/collections/luxe-skincare",
            productCount: 9,
            imageUrl: col("C6d393.jpg"),
          },
          {
            id: id(),
            title: "Moisture Magic",
            href: "/collections/moisture-magic",
            productCount: 9,
            imageUrl: col("C1_f724e030-afa8-496c-b92d-d7fa3d66b864c950.jpg"),
          },
        ],
      },
    },
    {
      type: "productGrid",
      props: { title: t.featured, limit: 8, collectionSlug: "skincare" },
    },
    {
      type: "imageTextSplit",
      props: {
        title: t.glowTitle,
        body: t.glowBody,
        ctaLabel: t.glowCta,
        ctaHref: "/collections/glow-essentials",
        imageUrl: img("Glow_naturally_f788952b-80e5-4ed6-824b-242e15636c4a84b8.jpg"),
        imagePosition: "right",
      },
    },
    {
      type: "productGrid",
      props: { title: t.trending, limit: 8 },
    },
    {
      type: "testimonials",
      props: {
        title: t.testimonials,
        items: [
          {
            id: id(),
            name: locale === "tr" ? "Ayşe K." : "Sarah M.",
            quote:
              locale === "tr"
                ? "Ürünler gerçekten nazik; cildim yumuşak ve dengeli hissediyor."
                : "Products feel gentle — my skin is soft and balanced.",
          },
          {
            id: id(),
            name: locale === "tr" ? "Elif M." : "James T.",
            quote:
              locale === "tr"
                ? "Mobil deneyim çok akıcı, sepete ekleme kolay."
                : "Smooth mobile experience and easy checkout.",
          },
        ],
      },
    },
    {
      type: "productGrid",
      props: { title: t.flash, limit: 4, collectionSlug: "facial-boosters" },
    },
    {
      type: "imageTextSplit",
      props: {
        title: t.bestSellers,
        body:
          locale === "tr"
            ? "Her an için özel seçilmiş bakım ve makyaj ürünleri."
            : "Curated care and beauty for every occasion.",
        ctaLabel: t.glowCta,
        ctaHref: "/collections/all",
        imageUrl: img("MG1_b0421d9f-5d83-4554-9ecb-3419c31cb87484b8.jpg"),
        imagePosition: "left",
      },
    },
    {
      type: "promoMarquee",
      props: { text: t.marquee },
    },
    {
      type: "newsletter",
      props: {
        title: t.newsletterTitle,
        subtitle: t.newsletterSub,
        buttonLabel: t.newsletterBtn,
      },
    },
  ];
}

/** Geriye dönük import */
export const storeHomePreset = buildStoreHomePreset("tr");
