import { parseMirrorSectionHead } from "@/lib/mirror-page-sections";

import type { MirrorElementKind } from "@/lib/mirror-element-edits";
import {
  marqueeTextElementId,
  pageBannerElementId,
  revealingTextElementId,
  richtextContentElementId,
} from "@/lib/mirror-element-edits";

export type EditableFieldDef = {
  id: string;
  kind: MirrorElementKind;
  label: string;
  defaultValue: string;
  sectionKey: string;
  hint?: string;
};

export function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function selectorKey(selector: string) {
  return selector.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "field";
}

function extractFieldsFromSectionBlock(sectionKey: string, block: string): EditableFieldDef[] {
  const fields: EditableFieldDef[] = [];
  const seen = new Set<string>();
  const imageBlock = block.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  function add(id: string, kind: MirrorElementKind, label: string, defaultValue: string, hint?: string) {
    if (seen.has(id)) return;
    seen.add(id);
    fields.push({ id, kind, label, defaultValue, sectionKey, hint });
  }

  if (block.includes("page-banner") || block.includes("page--title")) {
    const title = block.match(/class="page--title[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    const desc = block.match(/class="page--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const img =
      block.match(/class="page--banner-img[\s\S]*?data-original="([^"]+)"/i)?.[1] ??
      block.match(/class="page--banner-img[\s\S]*?\ssrc="([^"]+)"/i)?.[1];
    if (title) add(pageBannerElementId(sectionKey, "title"), "text", "Banner başlık", stripHtml(title));
    if (desc) add(pageBannerElementId(sectionKey, "desc"), "text", "Banner açıklama", stripHtml(desc));
    if (img) add(pageBannerElementId(sectionKey, "image"), "image", "Banner görseli", img.split("?")[0] ?? img);
  }

  const revealing = block.match(
    /class="revealing-text--content[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/i,
  )?.[1];
  if (revealing) {
    add(
      revealingTextElementId(sectionKey),
      "text",
      "Animasyonlu metin (tüm paragraf)",
      stripHtml(revealing),
      "Tek kutuda düzenleyin; vitrinde satırlara bölünür.",
    );
  }

  if (block.includes("section-richtext") || block.includes("richtext--content")) {
    const contentInner =
      block.match(/class="richtext--content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]?.trim() ?? "";
    add(
      richtextContentElementId(sectionKey),
      contentInner.includes("<") ? "html" : "text",
      "Metin bloğu — ana içerik",
      contentInner,
      "Metin, font, boyut ve renk — Görünüm alanından ayarlayın.",
    );
    let rhi = 0;
    const headingRe = /class="richtext--heading[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
    let rhm: RegExpExecArray | null;
    while ((rhm = headingRe.exec(block))) {
      add(
        `${sectionKey}--richtext-heading--${rhi}`,
        rhm[1].includes("<") ? "html" : "text",
        rhi === 0 ? "Metin bloğu — başlık" : `Metin bloğu — başlık ${rhi + 1}`,
        rhm[1].trim(),
      );
      rhi += 1;
    }
    let rdi = 0;
    const descRe = /class="richtext--description[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
    while ((rhm = descRe.exec(block))) {
      add(
        `${sectionKey}--richtext-description--${rdi}`,
        rhm[1].includes("<") ? "html" : "text",
        rdi === 0 ? "Metin bloğu — açıklama" : `Metin bloğu — açıklama ${rdi + 1}`,
        rhm[1].trim(),
      );
      rdi += 1;
    }
  }

  if (block.includes("section-marquee")) {
    const marqueeHtml = block.match(/class="marquee-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.trim() ?? "";
    add(
      marqueeTextElementId(sectionKey),
      "html",
      "İndirim şeridi metni",
      marqueeHtml,
      "Konturlu kısım: *yıldız* ile — örn. %20 indirim *KODU*",
    );
  }

  if (block.includes("section-collapsible-content") || block.includes("collapsible-content--")) {
    let ci = 0;
    const collapseTitleRe = /class="collapsible--text[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
    let ctm: RegExpExecArray | null;
    while ((ctm = collapseTitleRe.exec(block))) {
      add(
        `${sectionKey}--collapsible-title--${ci}`,
        "text",
        `SSS başlık ${ci + 1}`,
        stripHtml(ctm[1]),
      );
      ci += 1;
    }
    let cbi = 0;
    const collapseBodyRe = /class="collapsible--content-body[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    while ((ctm = collapseBodyRe.exec(block))) {
      add(
        `${sectionKey}--collapsible-body--${cbi}`,
        "html",
        `SSS içerik ${cbi + 1}`,
        ctm[1].trim(),
        "Paragraf ve link ekleyebilirsiniz.",
      );
      cbi += 1;
    }
  }

  const headingRe =
    /class="(media-content-heading|section--heading|section-heading|image-with-text--heading|collection--heading|section--description)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi;
  let hm: RegExpExecArray | null;
  const headingIdx = new Map<string, number>();
  while ((hm = headingRe.exec(block))) {
    const cls = hm[1].replace(/[^a-z0-9]+/gi, "-");
    const hi = headingIdx.get(cls) ?? 0;
    headingIdx.set(cls, hi + 1);
    add(
      `${sectionKey}--section--heading--${hi}`,
      hm[2].includes("<") ? "html" : "text",
      cls.includes("description") ? `Metin ${hi + 1}` : `Başlık ${hi + 1}`,
      hm[2].trim(),
      cls.includes("section--heading") || cls.includes("section-heading")
        ? "Vurgulu kısım için *yıldız* kullanın — örn. Müşteri *Yorumları*"
        : undefined,
    );
  }

  const descRe =
    /class="(media-content-description|image-with-text--text|image-with-text--desc|page--desc)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi;
  let di = 0;
  while ((hm = descRe.exec(block))) {
    const cls = hm[1].replace(/[^a-z0-9]+/gi, "-");
    add(`${sectionKey}--${cls}--${di}`, "html", `Metin ${di + 1}`, hm[2].trim());
    di += 1;
  }

  const pRe = /<p[^>]*class="[^"]*page--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
  let pi = 0;
  while ((hm = pRe.exec(block))) {
    add(`${sectionKey}--p--${pi}`, "text", `Paragraf ${pi + 1}`, stripHtml(hm[1]));
    pi += 1;
  }

  const imagePatterns: Array<{ re: RegExp; idBase: string; label: (i: number) => string }> = [
    {
      re: /class="image-with-text--image[\s\S]*?<img[^>]*>/gi,
      idBase: selectorKey(".image-with-text--image img"),
      label: () => "Ana görsel",
    },
    {
      re: /class="bs-products--image[\s\S]*?<img[^>]*>/gi,
      idBase: selectorKey(".bs-products--image img"),
      label: () => "Arka plan görseli",
    },
    {
      re: /class="button--img[\s\S]*?<img[^>]*>/gi,
      idBase: selectorKey(".button--img img"),
      label: (i) => `Buton görseli ${i + 1}`,
    },
    {
      re: /class="categories--item-image[\s\S]*?<img[^>]*>/gi,
      idBase: selectorKey(".categories--item-image img"),
      label: (i) => `Kategori görseli ${i + 1}`,
    },
    {
      re: /class="discover-look-wrapper"[\s\S]*?<img[^>]*>/gi,
      idBase: selectorKey(".discover-look-wrapper > .media img"),
      label: (i) => `Koleksiyon kapak görseli ${i + 1}`,
    },
    {
      re: /<img[^>]+class="[^"]*(?:media_image|collection--card-image)[^"]*"[^>]*>/gi,
      idBase: selectorKey("img.media_image"),
      label: (i) => `Görsel ${i + 1}`,
    },
    // NOT: `product--card-image` (ürün ızgarası kartları) bilinçli olarak dışarıda bırakıldı.
    // Koleksiyon/liste sayfalarında ürün kartları canlıda gerçek katalogla (yayındaki ürünler)
    // dinamik olarak değiştirilir; şablondaki kozmetik yer tutucu görselleri editöre
    // "Ürün görseli N" olarak düşmesin — düzenlense bile vitrinde ezilir.
  ];
  for (const { re, idBase, label } of imagePatterns) {
    let ii = 0;
    while ((hm = re.exec(imageBlock))) {
      const tag = hm[0];
      const url =
        tag.match(/data-original="([^"]+)"/i)?.[1] ??
        tag.match(/\ssrc="([^"]+)"/i)?.[1] ??
        "";
      if (!url) continue;
      add(`${sectionKey}--${idBase}--${ii}`, "image", label(ii), url.split("?")[0] ?? url);
      ii += 1;
    }
  }

  const btnRe = /<a[^>]*class="[^"]*button[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let bi = 0;
  while ((hm = btnRe.exec(block))) {
    add(`${sectionKey}--a-button--${bi}`, "link", `Buton link ${bi + 1}`, hm[1], stripHtml(hm[2]));
    bi += 1;
  }

  // NOT: Ürün kartı linkleri (a.product--image / a.product--title) dinamik katalogtan
  // üretilir; editöre düşürmüyoruz (aksi halde kozmetik şablon ürünleri "Ürün görsel/başlık
  // linki" olarak görünür ve düzenlense bile vitrinde ezilir).

  const themed: Array<{
    re: RegExp;
    kind: MirrorElementKind;
    label: (i: number) => string;
    idBase?: string;
  }> = [
    {
      re: /class="trending-products--title[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
      kind: "text",
      label: (i) => `Trend ürün adı ${i + 1}`,
    },
    {
      re: /class="trending-products--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      kind: "text",
      label: (i) => `Trend açıklama ${i + 1}`,
    },
    {
      re: /class="scrolling-collection--title[^"]*"[^>]*>\s*<span>([^<]*)</gi,
      kind: "text",
      label: (i) => `Koleksiyon şeridi ${i + 1}`,
    },
    {
      re: /class="author-title[^"]*"[^>]*>([\s\S]*?)<\//gi,
      kind: "text",
      label: (i) => `Yorum yazarı ${i + 1}`,
      idBase: "author-title",
    },
    {
      re: /class="testimonial--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      kind: "text",
      label: (i) => `Yorum metni ${i + 1}`,
      idBase: "testimonial--desc",
    },
    // NOT: Ürün kartı başlığı/adı/fiyatı (product-card--title, product--title,
    // product--actual-price) dinamik katalogtan gelir; editöre düşürmüyoruz.
    {
      re: /class="button--text[^"]*"[^>]*>([\s\S]*?)<\//gi,
      kind: "text",
      label: (i) => `Buton yazısı ${i + 1}`,
      idBase: selectorKey(".button--text"),
    },
    {
      re: /class="discover_data[^"]*"[^>]*>([\s\S]*?)<\//gi,
      kind: "text",
      label: (i) => `Explore etiketi ${i + 1}`,
      idBase: selectorKey(".discover_data"),
    },
    {
      re: /class="categories--text-inner top-text[^"]*"[^>]*>([\s\S]*?)<\//gi,
      kind: "text",
      label: (i) => `Kategori etiketi ${i + 1}`,
      idBase: selectorKey(".categories--text-inner.top-text"),
    },
  ];
  for (const { re, kind, label, idBase } of themed) {
    let ti = 0;
    while ((hm = re.exec(block))) {
      const val = hm[1].includes("<") ? hm[1].trim() : stripHtml(hm[1]);
      if (!val) continue;
      const cls =
        idBase ??
        re.source.match(/class="([^"]+)/)?.[1]?.replace(/[^a-z0-9]+/gi, "-") ??
        "field";
      add(`${sectionKey}--${cls}--${ti}`, kind, label(ti), val);
      ti += 1;
    }
  }

  return fields;
}

export function buildEditableCatalogFromHtml(html: string): Record<string, EditableFieldDef[]> {
  const catalog: Record<string, EditableFieldDef[]> = {};
  const sectionOpenRe = /<section\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionOpenRe.exec(html))) {
    const head = parseMirrorSectionHead(m[1]);
    if (!head) continue;
    const sectionKey = head.key;
    const block = sliceSectionHtml(html, sectionKey);
    if (!block) continue;
    const fields = extractFieldsFromSectionBlock(sectionKey, block);
    if (fields.length) catalog[sectionKey] = fields;
  }
  return catalog;
}

export function extractSwiperAutoplayMs(sectionHtml: string): number | null {
  const json = sectionHtml.match(/data-swiper='\s*(\{[\s\S]*?\})\s*'/i)?.[1];
  if (!json) return null;
  try {
    const normalized = json.replace(/'/g, '"');
    const parsed = JSON.parse(normalized) as { autoplay?: { delay?: number } };
    return parsed.autoplay?.delay ?? null;
  } catch {
    return null;
  }
}
