import type { ShopLocale } from "@/lib/i18n/locale";
import { escapeHtml } from "@/lib/html-plain-text";
import { localizeMirrorTextForLocale } from "@/lib/mirror-en-locale";
import type { SiteSettings } from "@/lib/site-settings";

export type AnnouncementBarSlide = {
  text: string;
  linkHref?: string;
  linkLabel?: string;
};

export type AnnouncementBarSettings = {
  enabled?: boolean;
  slides?: AnnouncementBarSlide[];
};

export const DEFAULT_ANNOUNCEMENT_SLIDES_TR: AnnouncementBarSlide[] = [
  { text: "300 TL üzeri siparişlerde ücretsiz kargo" },
  {
    text: "Aydınlatıcı C Vitamini Serumu",
    linkHref: "/collections",
    linkLabel: "Hemen Al!",
  },
];

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function buildAnnouncementSlideInnerHtml(slide: AnnouncementBarSlide): string {
  const text = escapeHtml(slide.text.trim());
  if (!text) return "";
  const href = slide.linkHref?.trim();
  const label = slide.linkLabel?.trim();
  if (href && label) {
    return `${text} – <a href="${escapeAttr(href)}" target="_blank" title="${escapeAttr(label)}">${escapeHtml(label)}</a>`;
  }
  return text;
}

export function normalizeAnnouncementSlidesFromSettings(
  bar: AnnouncementBarSettings | undefined,
): AnnouncementBarSlide[] {
  return [
    { text: bar?.slides?.[0]?.text ?? "" },
    {
      text: bar?.slides?.[1]?.text ?? "",
      linkHref: bar?.slides?.[1]?.linkHref ?? "",
      linkLabel: bar?.slides?.[1]?.linkLabel ?? "",
    },
  ];
}

export function serializeAnnouncementBarForSave(
  bar: AnnouncementBarSettings | undefined,
  slides: AnnouncementBarSlide[],
): AnnouncementBarSettings {
  return {
    enabled: bar?.enabled === false ? false : true,
    slides: [
      { text: slides[0]?.text?.trim() ?? "" },
      {
        text: slides[1]?.text?.trim() ?? "",
        linkHref: slides[1]?.linkHref?.trim() ?? "",
        linkLabel: slides[1]?.linkLabel?.trim() ?? "",
      },
    ],
  };
}

export function hasCustomAnnouncementBarSettings(settings: SiteSettings | undefined): boolean {
  return settings?.theme?.announcementBar !== undefined;
}

export function freeShippingAnnouncementText(minor: number | undefined, locale: ShopLocale): string | null {
  if (!minor || minor <= 0) return null;
  const amount = minor / 100;
  if (locale === "tr") return `${amount} TL üzeri siparişlerde ücretsiz kargo`;
  return `Free shipping on orders over ${amount} TL`;
}

function isFreeShippingAnnouncementText(text: string): boolean {
  return /ücretsiz\s*kargo|free\s*shipping/i.test(text);
}

function localizeAnnouncementSlide(
  slide: AnnouncementBarSlide,
  locale: ShopLocale,
  autoFreeShipping: string | null,
): AnnouncementBarSlide {
  if (locale !== "en") return slide;

  let text = slide.text.trim();
  if (!text) {
    return { ...slide, text: autoFreeShipping ?? "" };
  }
  if (autoFreeShipping && isFreeShippingAnnouncementText(text)) {
    return { ...slide, text: autoFreeShipping };
  }

  return {
    ...slide,
    text: localizeMirrorTextForLocale(text, locale),
    linkLabel: slide.linkLabel
      ? localizeMirrorTextForLocale(slide.linkLabel, locale)
      : slide.linkLabel,
  };
}

export function getAnnouncementBarSettings(
  settings: SiteSettings | undefined,
  locale: ShopLocale = "tr",
): AnnouncementBarSettings {
  const raw = settings?.theme?.announcementBar;
  const autoFreeShipping = freeShippingAnnouncementText(settings?.store?.freeShippingOverMinor, locale);

  if (!raw) {
    const slides: AnnouncementBarSlide[] = [
      { text: autoFreeShipping || DEFAULT_ANNOUNCEMENT_SLIDES_TR[0]!.text },
      { ...DEFAULT_ANNOUNCEMENT_SLIDES_TR[1]! },
    ];
    return {
      enabled: true,
      slides: slides.map((slide) => localizeAnnouncementSlide(slide, locale, autoFreeShipping)),
    };
  }

  const slide0Text = raw.slides?.[0]?.text?.trim();
  const slide1Raw = raw.slides?.[1];

  const slides: AnnouncementBarSlide[] = [
    {
      text: slide0Text || autoFreeShipping || DEFAULT_ANNOUNCEMENT_SLIDES_TR[0]!.text,
    },
    {
      text: slide1Raw?.text?.trim() ?? "",
      linkHref: slide1Raw?.linkHref?.trim() || undefined,
      linkLabel: slide1Raw?.linkLabel?.trim() || undefined,
    },
  ];

  return {
    enabled: raw.enabled !== false,
    slides: slides.map((slide) => localizeAnnouncementSlide(slide, locale, autoFreeShipping)),
  };
}

/** Header duyuru şeridi — tüm mirror sayfalar */
export function injectAnnouncementBarMirrorHtml(html: string, config: AnnouncementBarSettings): string {
  if (config.enabled === false) {
    return html.replace(
      /(<section\b[^>]*\bsection-announcement-bar\b[^>]*)(>)/i,
      `$1 data-kn-hidden="1" style="display:none!important"$2`,
    );
  }

  const slides = config.slides ?? [];
  if (!slides.length) return html;

  let slideIndex = 0;
  return html.replace(
    /(<p class="announcement-bar--text[^"]*">)([\s\S]*?)(<\/p>)/gi,
    (match, open: string, _inner: string, close: string) => {
      const slide = slides[slideIndex++];
      if (!slide) return match;
      const inner = buildAnnouncementSlideInnerHtml(slide);
      if (!inner) {
        return `${open}${close}`;
      }
      return `${open}${inner}${close}`;
    },
  );
}
