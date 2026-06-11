import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";
import { defaultFeatureCardsBlock } from "@/lib/blocks/presets/feature-cards-block";
import { storeHomePreset } from "@/lib/blocks/presets/techizmet-shop-home";
import { ensureEditorBlocks, type EditorShopBlock } from "@/lib/blocks/editor-ids";

const nid = () => nanoid(8);

export type PaletteItem = {
  label: string;
  icon: string;
  factory: () => EditorShopBlock;
};

export const SHOP_PALETTE_CATEGORIES: { title: string; items: PaletteItem[] }[] = [
  {
    title: "Özellikler",
    items: [
      {
        label: "Özellik kartları",
        icon: "⭐",
        factory: () => ({ ...defaultFeatureCardsBlock(), id: nid() }),
      },
    ],
  },
  {
    title: "Üst alan",
    items: [
      {
        label: "Duyuru şeridi",
        icon: "📢",
        factory: () => ({
          id: nid(),
          type: "announcementBar",
          props: { text: "Kampanya metni", linkLabel: "Detay", linkHref: "/" },
        }),
      },
      {
        label: "Slayt",
        icon: "🎠",
        factory: () => ({
          id: nid(),
          type: "heroSlider",
          props: {
            autoplayMs: 6000,
            slides: [
              {
                id: nid(),
                headline: "Başlık",
                subline: "Alt metin",
                ctaLabel: "Keşfet",
                ctaHref: "/collections/all",
              },
            ],
          },
        }),
      },
      {
        label: "Kayan kampanya",
        icon: "✨",
        factory: () => ({
          id: nid(),
          type: "promoMarquee",
          props: { text: "Ücretsiz kargo — sınırlı süre" },
        }),
      },
    ],
  },
  {
    title: "İçerik",
    items: [
      {
        label: "Metin",
        icon: "📝",
        factory: () => ({
          id: nid(),
          type: "text",
          props: { content: "Paragraf metni", as: "p", align: "center" },
        }),
      },
      {
        label: "Buton",
        icon: "🔘",
        factory: () => ({
          id: nid(),
          type: "button",
          props: { label: "Keşfet", href: "/collections/all", variant: "primary", align: "center" },
        }),
      },
      {
        label: "Görsel",
        icon: "🏞️",
        factory: () => ({
          id: nid(),
          type: "image",
          props: { src: "", alt: "", rounded: true },
        }),
      },
      {
        label: "Görsel + metin",
        icon: "🧩",
        factory: () => ({
          id: nid(),
          type: "imageTextSplit",
          props: {
            imageUrl: "",
            title: "Başlık",
            body: "Açıklama metni",
            ctaLabel: "İncele",
            ctaHref: "/",
            imagePosition: "left",
          },
        }),
      },
      {
        label: "Koleksiyon grid",
        icon: "📦",
        factory: () => ({
          id: nid(),
          type: "collectionGrid",
          props: {
            title: "Koleksiyonlar",
            items: [
              { id: nid(), title: "Koleksiyon 1", href: "/collections/skincare" },
            ],
          },
        }),
      },
      {
        label: "Ürünler",
        icon: "🛒",
        factory: () => ({
          id: nid(),
          type: "productGrid",
          props: { title: "Ürünler", limit: 8 },
        }),
      },
    ],
  },
  {
    title: "Diğer",
    items: [
      {
        label: "Harita",
        icon: "📍",
        factory: () => ({
          id: nid(),
          type: "map" as const,
          props: { address: "İstanbul", height: 400 },
        }),
      },
    ],
  },
  {
    title: "Alt alan",
    items: [
      {
        label: "Yorumlar",
        icon: "💬",
        factory: () => ({
          id: nid(),
          type: "testimonials",
          props: {
            title: "Müşteri yorumları",
            items: [{ id: nid(), name: "Ayşe K.", quote: "Harika ürünler!" }],
          },
        }),
      },
      {
        label: "Bülten",
        icon: "✉️",
        factory: () => ({
          id: nid(),
          type: "newsletter",
          props: {
            title: "Bültene kaydol",
            subtitle: "Kampanyalardan haberdar olun",
            buttonLabel: "Kaydol",
          },
        }),
      },
    ],
  },
];

const PALETTE_MAP = new Map<string, PaletteItem>();
for (const cat of SHOP_PALETTE_CATEGORIES) {
  for (const item of cat.items) PALETTE_MAP.set(item.label, item);
}

export function createBlockFromPaletteLabel(label: string): EditorShopBlock | null {
  return PALETTE_MAP.get(label)?.factory() ?? null;
}

export function kingNoorEditorPreset(): EditorShopBlock[] {
  return ensureEditorBlocks(storeHomePreset);
}
