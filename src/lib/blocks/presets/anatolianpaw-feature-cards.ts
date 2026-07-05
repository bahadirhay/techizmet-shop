import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";

/** Anatolian Paw — “Neden Anatolian Paw?” özellik kartları widget varsayılanı */
export function anatolianPawFeatureCardsBlock(): ShopBlock {
  return {
    type: "featureCards",
    props: {
      title: "Neden Anatolian Paw?",
      titleEn: "Why Anatolian Paw?",
      subtitle:
        "Köpeklerinizin sağlığı bizim için öncelik. Her ürünümüz özenle seçilmiş doğal malzemelerden üretilir.",
      subtitleEn:
        "Your dogs' health is our priority. Every product is made from carefully selected natural ingredients.",
      backgroundColor: "#faf7f2",
      items: [
        {
          id: nanoid(8),
          iconKey: "tr",
          heading: "Türkiye'de Üretim",
          headingEn: "Made in Turkey",
          description:
            "Türkiye'de en yüksek standartlarda üretim yapıyor, Avrupa'ya ihracat kalitesinde ürünler sunuyoruz.",
          descriptionEn:
            "We manufacture to the highest standards in Turkey, offering export-quality products.",
        },
        {
          id: nanoid(8),
          iconKey: "globe",
          heading: "Avrupa'da Test Edildi",
          headingEn: "Tested in Europe",
          description:
            "Yıllardır Avrupa pazarında satılan doğal köpek ödül mamaları ürünlerimiz, binlerce mutlu müşteri tarafından onaylandı.",
          descriptionEn:
            "Our natural dog treats have been sold in European markets for years, trusted by thousands of happy customers.",
          linkHref: "/collections/all",
        },
        {
          id: nanoid(8),
          iconKey: "leaf",
          heading: "%100 Doğal",
          headingEn: "100% Natural",
          description:
            "Katkı maddesi, koruyucu veya yapay lezzet içermeyen tamamen doğal köpek ödül maması ürünler.",
          descriptionEn:
            "Completely natural dog treats with no additives, preservatives, or artificial flavors.",
        },
        {
          id: nanoid(8),
          iconKey: "trophy",
          heading: "Kalite Garantisi",
          headingEn: "Quality Guarantee",
          description: "Tüm ürünlerimiz kalite kontrol süreçlerinden geçerek size ulaşır.",
          descriptionEn: "All our products reach you after passing quality control processes.",
        },
      ],
    },
  };
}
