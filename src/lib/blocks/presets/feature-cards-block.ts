import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";

/** Palette — boş şablon (her sayfada manuel doldurulur) */
export function defaultFeatureCardsBlock(): Extract<ShopBlock, { type: "featureCards" }> {
  return {
    type: "featureCards",
    props: {
      title: "Neden bizi tercih etmelisiniz?",
      subtitle: "Kısa bir açıklama metni buraya yazılır.",
      backgroundColor: "#faf7f2",
      items: [
        {
          id: nanoid(8),
          iconKey: "tr",
          heading: "Kaliteli üretim",
          description: "Ürünlerimiz yüksek standartlarda üretilir.",
        },
        {
          id: nanoid(8),
          iconKey: "globe",
          heading: "Güvenilir hizmet",
          description: "Müşteri memnuniyeti odaklı çalışıyoruz.",
        },
        {
          id: nanoid(8),
          iconKey: "leaf",
          heading: "Doğal içerik",
          description: "Doğal ve güvenilir malzemeler kullanıyoruz.",
        },
        {
          id: nanoid(8),
          iconKey: "trophy",
          heading: "Kalite garantisi",
          description: "Tüm ürünler kalite kontrolünden geçer.",
        },
      ],
    },
  };
}
