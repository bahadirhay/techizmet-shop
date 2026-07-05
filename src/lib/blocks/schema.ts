import { z } from "zod";

const announcementBarProps = z.object({
  text: z.string(),
  textEn: z.string().optional(),
  linkLabel: z.string().optional(),
  linkLabelEn: z.string().optional(),
  linkHref: z.string().optional(),
});

const heroSliderSlide = z.object({
  id: z.string(),
  imageUrl: z.string().optional(),
  headline: z.string(),
  headlineEn: z.string().optional(),
  subline: z.string().optional(),
  sublineEn: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaLabelEn: z.string().optional(),
  ctaHref: z.string().optional(),
});

const heroSliderProps = z.object({
  slides: z.array(heroSliderSlide).min(1).max(8),
  autoplayMs: z.number().int().min(0).optional(),
});

const textProps = z.object({
  content: z.string(),
  contentEn: z.string().optional(),
  as: z.enum(["p", "h1", "h2", "h3"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

const buttonProps = z.object({
  label: z.string(),
  labelEn: z.string().optional(),
  href: z.string(),
  variant: z.enum(["primary", "secondary", "outline"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

const imageProps = z.object({
  src: z.string(),
  alt: z.string().optional(),
  href: z.string().optional(),
  rounded: z.boolean().optional(),
});

const imageTextSplitProps = z.object({
  imageUrl: z.string(),
  imageAlt: z.string().optional(),
  title: z.string(),
  titleEn: z.string().optional(),
  body: z.string(),
  bodyEn: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaLabelEn: z.string().optional(),
  ctaHref: z.string().optional(),
  imagePosition: z.enum(["left", "right"]).optional(),
});

const collectionGridItem = z.object({
  id: z.string(),
  title: z.string(),
  titleEn: z.string().optional(),
  imageUrl: z.string().optional(),
  href: z.string(),
  productCount: z.number().int().optional(),
});

const collectionGridProps = z.object({
  title: z.string().optional(),
  titleEn: z.string().optional(),
  items: z.array(collectionGridItem).min(1),
});

const productGridProps = z.object({
  title: z.string().optional(),
  titleEn: z.string().optional(),
  collectionSlug: z.string().optional(),
  limit: z.number().int().min(1).max(24).optional(),
});

const testimonialsItem = z.object({
  id: z.string(),
  name: z.string(),
  quote: z.string(),
  quoteEn: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const testimonialsProps = z.object({
  title: z.string().optional(),
  titleEn: z.string().optional(),
  items: z.array(testimonialsItem).min(1),
});

const promoMarqueeProps = z.object({
  text: z.string(),
  textEn: z.string().optional(),
});

const newsletterProps = z.object({
  title: z.string(),
  titleEn: z.string().optional(),
  subtitle: z.string().optional(),
  subtitleEn: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonLabelEn: z.string().optional(),
});

const featureCardsItem = z.object({
  id: z.string(),
  iconUrl: z.string().optional(),
  iconKey: z.enum(["tr", "globe", "leaf", "trophy"]).optional(),
  iconText: z.string().optional(),
  heading: z.string(),
  headingEn: z.string().optional(),
  description: z.string(),
  descriptionEn: z.string().optional(),
  linkHref: z.string().optional(),
});

const featureCardsProps = z.object({
  title: z.string(),
  titleEn: z.string().optional(),
  subtitle: z.string().optional(),
  subtitleEn: z.string().optional(),
  backgroundColor: z.string().optional(),
  items: z.array(featureCardsItem).min(1).max(6),
});

const mapProps = z.object({
  embedUrl: z.string().optional(),
  address: z.string().optional(),
  height: z.number().int().min(200).max(800).optional(),
  fullWidth: z.boolean().optional(),
});

export const shopBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("announcementBar"), props: announcementBarProps }),
  z.object({ type: z.literal("heroSlider"), props: heroSliderProps }),
  z.object({ type: z.literal("text"), props: textProps }),
  z.object({ type: z.literal("button"), props: buttonProps }),
  z.object({ type: z.literal("image"), props: imageProps }),
  z.object({ type: z.literal("imageTextSplit"), props: imageTextSplitProps }),
  z.object({ type: z.literal("collectionGrid"), props: collectionGridProps }),
  z.object({ type: z.literal("productGrid"), props: productGridProps }),
  z.object({ type: z.literal("testimonials"), props: testimonialsProps }),
  z.object({ type: z.literal("promoMarquee"), props: promoMarqueeProps }),
  z.object({ type: z.literal("newsletter"), props: newsletterProps }),
  z.object({ type: z.literal("featureCards"), props: featureCardsProps }),
  z.object({ type: z.literal("map"), props: mapProps }),
]);

export type ShopBlock = z.infer<typeof shopBlockSchema>;

const blocksArraySchema = z.array(shopBlockSchema);

export function parseBlocks(raw: string | null | undefined): ShopBlock[] {
  if (!raw?.trim()) return [];
  try {
    const json = JSON.parse(raw) as unknown;
    const parsed = blocksArraySchema.safeParse(json);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function serializeBlocks(blocks: ShopBlock[]): string {
  return JSON.stringify(blocks);
}

/** Vitrin mirror config — güvenli blok listesi */
export function sanitizeShopBlocks(raw: unknown): ShopBlock[] {
  if (!Array.isArray(raw)) return [];
  const parsed = blocksArraySchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export const SHOP_BLOCK_LABELS: Record<ShopBlock["type"], string> = {
  map: "Harita",
  announcementBar: "Duyuru şeridi",
  heroSlider: "Slayt",
  text: "Metin",
  button: "Buton",
  image: "Görsel",
  imageTextSplit: "Görsel + metin",
  collectionGrid: "Koleksiyon grid",
  productGrid: "Ürün grid",
  testimonials: "Müşteri yorumları",
  promoMarquee: "Kampanya şeridi (kayan)",
  newsletter: "Bülten kayıt",
  featureCards: "Özellik kartları",
};
