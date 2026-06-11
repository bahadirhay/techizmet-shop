import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";

/** Anatolian Paw — “Neden Anatolian Paw?” özellik kartları widget varsayılanı */
export function anatolianPawFeatureCardsBlock(): ShopBlock {
  return {
    type: "featureCards",
    props: {
      title: "Neden Anatolian Paw?",
      subtitle:
        "Köpeklerinizin sağlığı bizim için öncelik. Her ürünümüz özenle seçilmiş doğal malzemelerden üretilir.",
      backgroundColor: "#faf7f2",
      items: [
        {
          id: nanoid(8),
          iconKey: "tr",
          heading: "Türkiye'de Üretim",
          description:
            "Türkiye'de en yüksek standartlarda üretim yapıyor, Avrupa'ya ihracat kalitesinde ürünler sunuyoruz.",
        },
        {
          id: nanoid(8),
          iconKey: "globe",
          heading: "Avrupa'da Test Edildi",
          description:
            "Yıllardır Avrupa pazarında satılan ürünlerimiz, binlerce mutlu müşteri tarafından onaylandı.",
          linkHref: "/collections/all",
        },
        {
          id: nanoid(8),
          iconKey: "leaf",
          heading: "%100 Doğal",
          description:
            "Katkı maddesi, koruyucu veya yapay lezzet içermeyen tamamen doğal ürünler.",
        },
        {
          id: nanoid(8),
          iconKey: "trophy",
          heading: "Kalite Garantisi",
          description: "Tüm ürünlerimiz kalite kontrol süreçlerinden geçerek size ulaşır.",
        },
      ],
    },
  };
}
