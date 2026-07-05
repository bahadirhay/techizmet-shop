import type { ShopLocale } from "@/lib/i18n/locale";
import type { ShopBlock } from "@/lib/blocks/schema";
import { anatolianPawFeatureCardsBlock } from "@/lib/blocks/presets/anatolianpaw-feature-cards";
import { applyMirrorEnReplacements } from "@/lib/mirror-en-locale";

type FeatureCardsProps = Extract<ShopBlock, { type: "featureCards" }>["props"];

const FEATURE_CARDS_EN_PRESET: FeatureCardsProps = (
  anatolianPawFeatureCardsBlock() as Extract<ShopBlock, { type: "featureCards" }>
).props;

function presetFeatureCardItem(heading: string) {
  return FEATURE_CARDS_EN_PRESET.items.find((item) => item.heading === heading);
}

/** TR metin + isteğe bağlı EN — vitrin diline göre seçim */
export function pickBlockText(tr: string, en: string | undefined, locale: ShopLocale): string {
  if (locale !== "en") return tr;
  if (en?.trim()) return en.trim();
  return applyMirrorEnReplacements(tr);
}

/** Widget / CMS blok — hedef dilde metinleri çöz */
export function resolveShopBlockForLocale(block: ShopBlock, locale: ShopLocale): ShopBlock {
  switch (block.type) {
    case "text":
      return {
        ...block,
        props: {
          ...block.props,
          content: pickBlockText(block.props.content, block.props.contentEn, locale),
        },
      };
    case "button":
      return {
        ...block,
        props: {
          ...block.props,
          label: pickBlockText(block.props.label, block.props.labelEn, locale),
        },
      };
    case "announcementBar":
      return {
        ...block,
        props: {
          ...block.props,
          text: pickBlockText(block.props.text, block.props.textEn, locale),
          linkLabel: block.props.linkLabel
            ? pickBlockText(block.props.linkLabel, block.props.linkLabelEn, locale)
            : undefined,
        },
      };
    case "heroSlider":
      return {
        ...block,
        props: {
          ...block.props,
          slides: block.props.slides.map((s) => ({
            ...s,
            headline: pickBlockText(s.headline, s.headlineEn, locale),
            subline: s.subline ? pickBlockText(s.subline, s.sublineEn, locale) : undefined,
            ctaLabel: s.ctaLabel ? pickBlockText(s.ctaLabel, s.ctaLabelEn, locale) : undefined,
          })),
        },
      };
    case "imageTextSplit":
      return {
        ...block,
        props: {
          ...block.props,
          title: pickBlockText(block.props.title, block.props.titleEn, locale),
          body: pickBlockText(block.props.body, block.props.bodyEn, locale),
          ctaLabel: block.props.ctaLabel
            ? pickBlockText(block.props.ctaLabel, block.props.ctaLabelEn, locale)
            : undefined,
        },
      };
    case "testimonials":
      return {
        ...block,
        props: {
          ...block.props,
          title: block.props.title
            ? pickBlockText(block.props.title, block.props.titleEn, locale)
            : undefined,
          items: block.props.items.map((item) => ({
            ...item,
            quote: pickBlockText(item.quote, item.quoteEn, locale),
          })),
        },
      };
    case "newsletter":
      return {
        ...block,
        props: {
          ...block.props,
          title: pickBlockText(block.props.title, block.props.titleEn, locale),
          subtitle: block.props.subtitle
            ? pickBlockText(block.props.subtitle, block.props.subtitleEn, locale)
            : undefined,
          buttonLabel: block.props.buttonLabel
            ? pickBlockText(block.props.buttonLabel, block.props.buttonLabelEn, locale)
            : undefined,
        },
      };
    case "promoMarquee":
      return {
        ...block,
        props: {
          ...block.props,
          text: pickBlockText(block.props.text, block.props.textEn, locale),
        },
      };
    case "collectionGrid":
      return {
        ...block,
        props: {
          ...block.props,
          title: block.props.title
            ? pickBlockText(block.props.title, block.props.titleEn, locale)
            : undefined,
          items: block.props.items.map((item) => ({
            ...item,
            title: pickBlockText(item.title, item.titleEn, locale),
          })),
        },
      };
    case "productGrid":
      return {
        ...block,
        props: {
          ...block.props,
          title: block.props.title
            ? pickBlockText(block.props.title, block.props.titleEn, locale)
            : undefined,
        },
      };
    case "featureCards": {
      const preset = FEATURE_CARDS_EN_PRESET;
      return {
        ...block,
        props: {
          ...block.props,
          title: pickBlockText(
            block.props.title,
            block.props.titleEn || preset.titleEn,
            locale,
          ),
          subtitle: block.props.subtitle
            ? pickBlockText(
                block.props.subtitle,
                block.props.subtitleEn || preset.subtitleEn,
                locale,
              )
            : undefined,
          items: block.props.items.map((item) => {
            const match = presetFeatureCardItem(item.heading);
            return {
              ...item,
              heading: pickBlockText(item.heading, item.headingEn || match?.headingEn, locale),
              description: pickBlockText(
                item.description,
                item.descriptionEn || match?.descriptionEn,
                locale,
              ),
            };
          }),
        },
      };
    }
    default:
      return block;
  }
}
