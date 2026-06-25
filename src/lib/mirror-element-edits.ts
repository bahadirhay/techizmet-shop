/** Ana sayfa — tıkla-düzenle: her metin / görsel / link */

import { isAnchorNode, isImageNode } from "@/lib/mirror-dom-node";
import { plainTextToMarqueeHtml, plainTextToSimpleHtml } from "@/lib/html-plain-text";
import {
  applyElementTypography,
  type MirrorElementTypography,
} from "@/lib/mirror-element-typography";
import {
  MIRROR_CARD_IMAGE_WIDTH,
  MIRROR_HERO_TILE_WIDTH,
  MIRROR_MOBILE_LCP_WIDTH,
  mirrorCdnImageUrl,
} from "@/lib/mirror-cdn-image";

export type { MirrorElementTypography } from "@/lib/mirror-element-typography";

export type MirrorElementKind = "html" | "text" | "image" | "link";

export type MirrorElementEdit = {
  id: string;
  kind: MirrorElementKind;
  html?: string;
  /** İngilizce vitrin için ayrı metin (boşsa EN'de TR override uygulanmaz) */
  htmlEn?: string;
  text?: string;
  imageUrl?: string;
  href?: string;
  style?: MirrorElementTypography;
};

export type MirrorElementPick = {
  id: string;
  kind: MirrorElementKind;
  value: string;
  label: string;
};

/** page-banner — sabit id (tıkla-düzenle + sol panel) */
export function pageBannerElementId(sectionKey: string, part: "title" | "desc" | "image") {
  return `${sectionKey}--banner-${part}`;
}

export function revealingTextElementId(sectionKey: string) {
  return `${sectionKey}--revealing-text`;
}

export function richtextContentElementId(sectionKey: string) {
  return `${sectionKey}--richtext-content--0`;
}

export function marqueeTextElementId(sectionKey: string) {
  return `${sectionKey}--marquee-text--0`;
}

/** Vitrin kaydı varsa site geneli marquee enjeksiyonunu atla */
export function hasMarqueeElementOverride(
  elements: Record<string, MirrorElementEdit> | undefined,
  sectionKey?: string,
): boolean {
  if (!elements) return false;
  if (sectionKey) {
    const id = marqueeTextElementId(sectionKey);
    const edit = elements[id] ?? Object.values(elements).find((e) => e.id === id);
    return Boolean(edit?.html?.trim() || edit?.text?.trim());
  }
  return Object.values(elements).some(
    (edit) =>
      /--marquee-text--/.test(edit.id) && Boolean(edit.html?.trim() || edit.text?.trim()),
  );
}

export function sectionHeadingElementId(sectionKey: string, index = 0) {
  return `${sectionKey}--section--heading--${index}`;
}

/** Katalog / damga id — tek biçim */
export function canonicalElementEditId(id: string): string {
  return id
    .replace(/--section-heading--/, "--section--heading--")
    .replace(/--section-description--/, "--section--description--");
}

function stampEditIdForSelector(sectionKey: string, sel: string, idx: number): string {
  if (sel === ".section--heading" || sel === ".section-heading") {
    return sectionHeadingElementId(sectionKey, idx);
  }
  if (sel === ".section--description" || sel === ".section-description") {
    return `${sectionKey}--section--description--${idx}`;
  }
  const selKey = sel.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "el";
  return `${sectionKey}--${selKey}--${idx}`;
}

/** mirror-editable-catalog idBase → DOM seçici */
const IMAGE_EDIT_SUFFIX_SELECTORS: Record<string, string> = {
  "button-img-img": ".button--img img",
  "bs-products-image-img": ".bs-products--image img",
  "image-with-text-image-img": ".image-with-text--image img",
  "discover-look-wrapper-media-img": ".discover-look-wrapper > .media img, .discover-look-wrapper .media img",
  "img-media-image": "img.media_image",
  "img-product-card-image": "img.product--card-image",
  "categories-item-image-img": ".categories--item-image img",
};

function sectionKeyFromSection(section: Element): string {
  return (
    section.id.match(/__([a-zA-Z0-9_]+)$/)?.[1] ??
    section.id.replace(/[^a-zA-Z0-9_]/g, "_").slice(-24) ??
    "section"
  );
}

function inferKind(el: Element): MirrorElementKind {
  if (isImageNode(el)) return "image";
  if (isAnchorNode(el)) return "link";
  const tag = el.tagName;
  if (tag === "IMG") return "image";
  if (tag === "A") return "link";
  const html = el.innerHTML?.trim() ?? "";
  if (html.includes("<") && html.length > 0) return "html";
  return "text";
}

function stampPageBannerSection(section: Element, sectionKey: string): number {
  let n = 0;
  const title = section.querySelector(".page--title");
  if (title && !title.hasAttribute("data-kn-edit")) {
    title.setAttribute("data-kn-edit", pageBannerElementId(sectionKey, "title"));
    title.setAttribute("data-kn-kind", "text");
    n += 1;
  }
  const desc = section.querySelector(".page--desc");
  if (desc && !desc.hasAttribute("data-kn-edit")) {
    desc.setAttribute("data-kn-edit", pageBannerElementId(sectionKey, "desc"));
    desc.setAttribute("data-kn-kind", "text");
    n += 1;
  }
  const img = section.querySelector(".page--banner-img img, .page--banner > .page--banner-img img");
  if (isImageNode(img) && !img.hasAttribute("data-kn-edit")) {
    img.setAttribute("data-kn-edit", pageBannerElementId(sectionKey, "image"));
    img.setAttribute("data-kn-kind", "image");
    n += 1;
  }
  return n;
}

function stampRevealingTextSection(section: Element, sectionKey: string): number {
  const staticEl = section.querySelector(".kn-revealing-static-text");
  if (staticEl && !staticEl.hasAttribute("data-kn-edit")) {
    staticEl.setAttribute("data-kn-edit", revealingTextElementId(sectionKey));
    staticEl.setAttribute("data-kn-kind", "text");
    return 1;
  }
  const el = section.querySelector(".revealing-text--content, [data-text-reveal]");
  if (!el || el.hasAttribute("data-kn-edit")) return 0;
  el.setAttribute("data-kn-edit", revealingTextElementId(sectionKey));
  el.setAttribute("data-kn-kind", "text");
  return 1;
}

function stampCollapsibleSection(section: Element, sectionKey: string): number {
  let n = 0;
  section.querySelectorAll(".collapsible--text").forEach((el, idx) => {
    if (el.hasAttribute("data-kn-edit")) return;
    el.setAttribute("data-kn-edit", `${sectionKey}--collapsible-title--${idx}`);
    el.setAttribute("data-kn-kind", "text");
    n += 1;
  });
  section.querySelectorAll(".collapsible--content-body").forEach((el, idx) => {
    if (el.hasAttribute("data-kn-edit")) return;
    el.setAttribute("data-kn-edit", `${sectionKey}--collapsible-body--${idx}`);
    el.setAttribute("data-kn-kind", inferKind(el));
    n += 1;
  });
  return n;
}

function stampRichtextSection(section: Element, sectionKey: string): number {
  let n = 0;
  const content = section.querySelector(".richtext--content");
  if (content && !content.hasAttribute("data-kn-edit")) {
    content.setAttribute("data-kn-edit", richtextContentElementId(sectionKey));
    content.setAttribute("data-kn-kind", inferKind(content));
    n += 1;
  }
  section.querySelectorAll(".richtext--heading").forEach((el, idx) => {
    if (el.hasAttribute("data-kn-edit")) return;
    el.setAttribute("data-kn-edit", `${sectionKey}--richtext-heading--${idx}`);
    el.setAttribute("data-kn-kind", inferKind(el));
    n += 1;
  });
  section.querySelectorAll(".richtext--description").forEach((el, idx) => {
    if (el.hasAttribute("data-kn-edit")) return;
    el.setAttribute("data-kn-edit", `${sectionKey}--richtext-description--${idx}`);
    el.setAttribute("data-kn-kind", inferKind(el));
    n += 1;
  });
  return n;
}

function stampMarqueeSection(section: Element, sectionKey: string): number {
  const id = marqueeTextElementId(sectionKey);
  let n = 0;
  section.querySelectorAll(".marquee-text").forEach((el) => {
    if (el.hasAttribute("data-kn-edit")) return;
    el.setAttribute("data-kn-edit", id);
    el.setAttribute("data-kn-kind", "html");
    n += 1;
  });
  return n;
}

function escapeButtonChar(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function syncAnimatedButtonText(el: Element, value: string) {
  const host = el.closest("a, button, .button") ?? el.parentElement;
  const hover = host?.querySelector("button-animate.button--hover-text");
  if (!hover) return;
  hover.innerHTML = value
    .split("")
    .map((char) => `<span class="button-char" data-button-char>${char === " " ? "&nbsp;" : escapeButtonChar(char)}</span>`)
    .join("");
}

/** Vitrin + admin önizleme — düzenlenebilir alanları işaretle */
export function stampMirrorEditableElements(doc: Document): number {
  const main = doc.getElementById("MainContent");
  if (!main) return 0;

  let n = 0;
  main.querySelectorAll("section.page-banner, section.section-page-banner").forEach((section) => {
    const sectionKey =
      section.id.match(/__([a-zA-Z0-9_]+)$/)?.[1] ??
      section.id.replace(/[^a-zA-Z0-9_]/g, "_").slice(-24) ??
      "page-banner";
    n += stampPageBannerSection(section, sectionKey);
  });

  main.querySelectorAll("[id^='media-grid-grid_']").forEach((item) => {
    const itemId = item.id;
    if (!itemId) return;
    const desc = item.querySelector(".media-content-description");
    if (desc && !desc.hasAttribute("data-kn-edit")) {
      desc.setAttribute("data-kn-edit", `${itemId}--description`);
      desc.setAttribute("data-kn-kind", "text");
      n += 1;
    }
    const btn = item.querySelector(".button--text");
    if (btn && !btn.hasAttribute("data-kn-edit")) {
      btn.setAttribute("data-kn-edit", `${itemId}--button-text`);
      btn.setAttribute("data-kn-kind", "text");
      n += 1;
    }
  });

  main.querySelectorAll("section.section-revealing-text, section[class*='revealing-text']").forEach((section) => {
    n += stampRevealingTextSection(section, sectionKeyFromSection(section));
  });

  main.querySelectorAll("section.section-richtext, section[class*='section-richtext']").forEach((section) => {
    n += stampRichtextSection(section, sectionKeyFromSection(section));
  });

  main.querySelectorAll("section.section-marquee, section[class*='section-marquee']").forEach((section) => {
    n += stampMarqueeSection(section, sectionKeyFromSection(section));
  });

  main.querySelectorAll("section.section-collapsible-content, section[class*='collapsible-content']").forEach(
    (section) => {
      n += stampCollapsibleSection(section, sectionKeyFromSection(section));
    },
  );

  const selectors = [
    ".section--heading",
    ".section--description",
    ".section-heading",
    ".media-content-heading",
    ".media-content-description",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    ".marquee--text",
    ".marquee__text",
    ".marquee-text",
    ".richtext--heading",
    ".richtext--description",
    ".richtext--content",
    ".image-with-text--heading",
    ".image-with-text--text",
    ".image-with-text--desc",
    ".testimonial--text",
    ".testimonial--desc",
    ".testimonial--author",
    ".author-title",
    ".trending-products--title",
    ".trending-products--desc",
    ".trending-products--price",
    ".scrolling-collection--title",
    ".button--text",
    ".discover_data",
    ".categories--text-inner.top-text",
    ".product--title",
    ".product--actual-price",
    ".revealing-text--content",
    "[data-text-reveal]",
    ".announcement-bar--message",
    "img.media_image",
    "img.product--card-image",
    ".image-with-text--image img",
    ".bs-products--image img",
    ".button--img img",
    ".categories--item-image img",
    ".discover-look-wrapper > .media img",
    "a.product--image",
    "a.product--title",
    "a.button",
    "a.outline--btn",
    "button.arrow--btn",
    ".btn",
    ".collection--card-title",
    ".collection--heading",
    ".page--title",
    ".page--desc",
    ".product-card--title",
    ".product-card--price",
  ];
  const forceTextSelectors = new Set([".product--title", ".product--actual-price"]);

  for (const sel of selectors) {
    const perSection = new Map<string, number>();
    main.querySelectorAll(sel).forEach((el) => {
      if (el.closest("header, footer, nav, script, noscript")) return;
      if (el.hasAttribute("data-kn-edit")) {
        n += 1;
        return;
      }
      const section = el.closest("section.kn-mirror-section");
      const sectionKey =
        section?.id?.match(/__([a-zA-Z0-9_]+)$/)?.[1] ??
        section?.id?.replace(/[^a-zA-Z0-9_]/g, "_").slice(-24) ??
        "main";
      const idx = perSection.get(sectionKey) ?? 0;
      perSection.set(sectionKey, idx + 1);
      const id = stampEditIdForSelector(sectionKey, sel, idx);
      const kind = forceTextSelectors.has(sel) ? "text" : inferKind(el);
      el.setAttribute("data-kn-edit", id);
      el.setAttribute("data-kn-kind", kind);
      n += 1;
    });
  }
  return n;
}

export function mirrorElementEditAliases(id: string): string[] {
  const out: string[] = [];
  const classHeading = id.match(/^(.+)--(section-heading|section--heading)--(\d+)$/);
  if (classHeading) {
    const [, sec, part, idx] = classHeading;
    const altPart = part === "section-heading" ? "section--heading" : "section-heading";
    out.push(`${sec}--${altPart}--${idx}`);
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
      out.push(`${sec}--${tag}--${idx}`);
    }
    return out;
  }
  const classDesc = id.match(/^(.+)--(section-description|section--description)--(\d+)$/);
  if (classDesc) {
    const [, sec, part, idx] = classDesc;
    const altPart = part === "section-description" ? "section--description" : "section-description";
    out.push(`${sec}--${altPart}--${idx}`);
    out.push(`${sec}--p--${idx}`);
    if (idx === "1") out.push(`${sec}--section-description--0`, `${sec}--section--description--0`);
    return out;
  }
  const tagHeading = id.match(/^(.+)--(h[1-6])--(\d+)$/);
  if (tagHeading) {
    const [, sec, , idx] = tagHeading;
    out.push(`${sec}--section-heading--${idx}`);
    out.push(`${sec}--section--heading--${idx}`);
    return out;
  }
  const tagP = id.match(/^(.+)--p--(\d+)$/);
  if (tagP) {
    const [, sec, idx] = tagP;
    out.push(`${sec}--section-description--${idx}`);
    out.push(`${sec}--section--description--${idx}`);
  }
  return out;
}

/** Katalog / damga id uyumu — kayıtlı düzenlemeyi bul */
export function resolveMirrorElementEdit(
  id: string,
  edits: Record<string, MirrorElementEdit> | undefined,
): MirrorElementEdit | undefined {
  if (!edits) return undefined;
  const canonical = canonicalElementEditId(id);
  if (edits[canonical]) return edits[canonical];
  if (edits[id]) return edits[id];
  for (const alias of mirrorElementEditAliases(canonical)) {
    if (edits[alias]) return edits[alias];
  }
  for (const edit of Object.values(edits)) {
    const editCanonical = canonicalElementEditId(edit.id);
    if (editCanonical === canonical || edit.id === id || mirrorElementEditAliases(edit.id).includes(id)) {
      return edit;
    }
  }
  return undefined;
}

/** Bölüm başlığı vitrin elements içinde kayıtlı mı */
export function hasSectionHeadingElementOverride(
  sectionKey: string,
  elements: Record<string, MirrorElementEdit> | undefined,
  index = 0,
): boolean {
  if (!elements) return false;
  const canonical = sectionHeadingElementId(sectionKey, index);
  const edit = resolveMirrorElementEdit(canonical, elements);
  return Boolean(edit?.html?.trim() || edit?.text?.trim() || edit?.style);
}

function escapeEditId(id: string) {
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseImageEditId(editId: string): { sectionKey: string; suffix: string; index: number } | null {
  const m = editId.match(/^(.+)--([a-z0-9-]+)--(\d+)$/i);
  if (!m) return null;
  const suffix = m[2]!;
  if (!IMAGE_EDIT_SUFFIX_SELECTORS[suffix]) return null;
  return { sectionKey: m[1]!, suffix, index: Number(m[3]) };
}

function findElementsForEditFallback(doc: Document, editId: string): Element[] {
  const canonical = canonicalElementEditId(editId);
  const heading =
    canonical.match(/^(.+)--section--heading--(\d+)$/) ??
    editId.match(/^(.+)--section-heading--(\d+)$/);
  if (heading) {
    const [, sectionKey, idxStr] = heading;
    const section = doc.querySelector(`section[id$="__${sectionKey}"]`);
    if (!section) return [];
    const headings = section.querySelectorAll(".section--heading, .section-heading");
    const el = headings[Number(idxStr)];
    return el ? [el] : [];
  }

  const tagHeading =
    canonical.match(/^(.+)--(h[1-6])--(\d+)$/) ?? editId.match(/^(.+)--(h[1-6])--(\d+)$/);
  if (tagHeading) {
    const [, sectionKey, , idxStr] = tagHeading;
    const section = doc.querySelector(`section[id$="__${sectionKey}"]`);
    if (!section) return [];
    const headings = section.querySelectorAll(
      ".section--heading, .section-heading, h1, h2, h3, h4, h5, h6",
    );
    const el = headings[Number(idxStr)];
    return el ? [el] : [];
  }

  const tagP = canonical.match(/^(.+)--p--(\d+)$/) ?? editId.match(/^(.+)--p--(\d+)$/);
  if (tagP) {
    const [, sectionKey, idxStr] = tagP;
    const section = doc.querySelector(`section[id$="__${sectionKey}"]`);
    if (!section) return [];
    const desc = section.querySelectorAll(".section--description, .section-description, p");
    const el = desc[Number(idxStr)];
    return el ? [el] : [];
  }

  const marquee =
    canonical.match(/^(.+)--marquee-text--(\d+)$/) ??
    editId.match(/^(.+)--marquee-text--(\d+)$/);
  if (marquee) {
    const [, sectionKey] = marquee;
    const section = doc.querySelector(`section[id$="__${sectionKey}"]`);
    if (!section) return [];
    return [...section.querySelectorAll(".marquee-text")];
  }

  const collapsibleTitle =
    canonical.match(/^(.+)--collapsible-title--(\d+)$/) ??
    editId.match(/^(.+)--collapsible-title--(\d+)$/);
  if (collapsibleTitle) {
    const [, sectionKey, idxStr] = collapsibleTitle;
    const section = doc.querySelector(`section[id$="__${sectionKey}"]`);
    if (!section) return [];
    const nodes = section.querySelectorAll(".collapsible--text");
    const el = nodes[Number(idxStr)];
    return el ? [el] : [];
  }

  const collapsibleBody =
    canonical.match(/^(.+)--collapsible-body--(\d+)$/) ??
    editId.match(/^(.+)--collapsible-body--(\d+)$/);
  if (collapsibleBody) {
    const [, sectionKey, idxStr] = collapsibleBody;
    const section = doc.querySelector(`section[id$="__${sectionKey}"]`);
    if (!section) return [];
    const nodes = section.querySelectorAll(".collapsible--content-body");
    const el = nodes[Number(idxStr)];
    return el ? [el] : [];
  }

  const img = parseImageEditId(canonical) ?? parseImageEditId(editId);
  if (img) {
    const section = doc.querySelector(`section[id$="__${img.sectionKey}"]`);
    if (!section) return [];
    const sel = IMAGE_EDIT_SUFFIX_SELECTORS[img.suffix]!;
    const nodes = section.querySelectorAll(sel);
    const el = nodes[img.index];
    return el ? [el] : [];
  }

  return [];
}

function findElementsForEdit(doc: Document, editId: string): Element[] {
  const tryIds = [editId, canonicalElementEditId(editId), ...mirrorElementEditAliases(editId)];
  const out: Element[] = [];
  for (const id of tryIds) {
    doc.querySelectorAll(`[data-kn-edit="${escapeEditId(id)}"]`).forEach((el) => {
      if (!out.includes(el)) out.push(el);
    });
  }
  if (out.length) return out;
  return findElementsForEditFallback(doc, editId);
}

export function readElementValue(el: Element, kind: MirrorElementKind): string {
  if (kind === "image" && isImageNode(el)) {
    return el.getAttribute("data-original") ?? el.src ?? "";
  }
  if (kind === "link" && isAnchorNode(el)) return el.href ?? "";
  if (kind === "html") return el.innerHTML ?? "";
  return (el.textContent ?? "").trim();
}

function applyUserImage(el: HTMLImageElement, url: string) {
  const base = url.split("?")[0] ?? url;
  const isHero = el.classList.contains("media_image");
  const isCard =
    el.classList.contains("product--card-image") || el.classList.contains("collections-tab--image");
  const width = isCard
    ? MIRROR_CARD_IMAGE_WIDTH
    : isHero
      ? MIRROR_MOBILE_LCP_WIDTH
      : MIRROR_HERO_TILE_WIDTH;
  const sized = mirrorCdnImageUrl(base, width);
  el.classList.remove("lazyload", "lazyloading");
  el.classList.add("lazyloaded");
  el.removeAttribute("loading");
  el.removeAttribute("data-widths");
  el.removeAttribute("data-sizes");
  el.removeAttribute("data-aspectratio");
  el.removeAttribute("srcset");
  el.removeAttribute("data-srcset");
  if (isHero && !isCard) {
    el.setAttribute("fetchpriority", "high");
  } else {
    el.setAttribute("loading", "lazy");
    el.removeAttribute("fetchpriority");
  }
  el.src = sized;
  el.setAttribute("data-src", sized);
  el.setAttribute("data-original", base);
  el.setAttribute("data-kn-sized", "1");
  el.setAttribute("data-kn-user-applied", "1");
  const noscript = el.parentElement?.querySelector("noscript img");
  if (noscript && isImageNode(noscript)) {
    noscript.src = base;
    noscript.setAttribute("data-kn-user-applied", "1");
  }
}

export function applyElementValue(el: Element, kind: MirrorElementKind, value: string) {
  const v = value.trim();
  if (!v) return;
  if (kind === "image" && isImageNode(el)) {
    applyUserImage(el, v);
    return;
  }
  if (kind === "link" && isAnchorNode(el)) {
    el.href = v;
    return;
  }
  if (kind === "html") {
    el.innerHTML = v;
    el.setAttribute("data-kn-user-applied", "1");
    return;
  }
  if (
    el.classList.contains("kn-revealing-static-text") ||
    el.closest(".kn-revealing-static")
  ) {
    el.innerHTML = plainTextToSimpleHtml(v);
    return;
  }
  if (
    el.classList.contains("revealing-text--content") ||
    el.hasAttribute("data-text-reveal") ||
    el.getAttribute("data-kn-edit")?.endsWith("--revealing-text")
  ) {
    el.textContent = v;
    el.setAttribute("data-text", v);
    const host = el.closest("reveal-text") ?? el.parentElement;
    host?.querySelectorAll(".revealing-text-line").forEach((line) => line.remove());
    return;
  }
  if (el.classList.contains("button--text")) {
    el.textContent = v;
    syncAnimatedButtonText(el, v);
    return;
  }
  if (el.classList.contains("top-text")) {
    el.textContent = v;
    el.parentElement?.querySelectorAll(".bottom-text").forEach((node) => {
      node.textContent = v;
    });
    return;
  }
  el.textContent = v;
}

export function resolveMarqueeElementEdit(
  sectionKey: string,
  elements: Record<string, MirrorElementEdit> | undefined,
): MirrorElementEdit | undefined {
  return resolveMirrorElementEdit(marqueeTextElementId(sectionKey), elements);
}

export function resolveMarqueeHtmlFromEdit(edit: MirrorElementEdit | undefined): string {
  if (!edit) return "";
  if (edit.html?.trim()) return edit.html.trim();
  if (edit.text?.trim()) return plainTextToMarqueeHtml(edit.text);
  return "";
}

/** Kayan şerit — bölümdeki tüm kopyalara aynı HTML + okunabilir kaydırma */
export function applyMarqueeTextToSection(section: Element, html: string) {
  const v = html.trim();
  if (!v) return;
  section.querySelectorAll(".marquee-text").forEach((el) => {
    applyElementValue(el, "html", v);
  });
  enhanceMarqueeSection(section);
}

/** Tema varsayılanı: kaydırma kapalı + dev punto — vitrin için düzelt */
export function enhanceMarqueeSection(section: Element) {
  section.classList.add("kn-marquee-readable");
  section.querySelectorAll(".marquee--block-node").forEach((node) => {
    node.classList.add("autoplay--infinite");
  });
  section.querySelectorAll(".marquee-text .outline--filled").forEach((el) => {
    el.classList.add("outline-animate");
  });
}

export function applyMirrorElementEdits(
  doc: Document,
  edits: Record<string, MirrorElementEdit> | undefined,
  locale: import("@/lib/i18n/locale").ShopLocale = "tr",
) {
  if (!edits) return;
  stampMirrorEditableElements(doc);
  for (const edit of Object.values(edits)) {
    const editId = canonicalElementEditId(edit.id);
    const marqueeMatch = editId.match(/^(.+)--marquee-text--\d+$/);
    if (marqueeMatch) {
      const html = resolveMarqueeHtmlFromEdit(edit);
      if (!html) continue;
      const section = doc.querySelector(`section[id$="__${marqueeMatch[1]}"]`);
      if (section) {
        applyMarqueeTextToSection(section, html);
        continue;
      }
    }
    const targets = findElementsForEdit(doc, editId);
    if (!targets.length) continue;

    // EN locale: htmlEn varsa onu kullan; yoksa TR override'ı atla (orijinal EN HTML korunur)
    const effectiveHtml =
      locale === "en" && edit.htmlEn !== undefined
        ? (edit.htmlEn?.trim() || null) // boş string = orijinal HTML'i koru
        : locale === "en"
          ? null // htmlEn tanımlı değil → TR override'ı EN'e uygulamaz
          : (edit.html ?? null);

    for (const el of targets) {
      if (edit.imageUrl) applyElementValue(el, "image", edit.imageUrl);
      else if (edit.href) applyElementValue(el, "link", edit.href);
      else if (effectiveHtml) applyElementValue(el, "html", effectiveHtml);
      else if (locale !== "en" && edit.text) applyElementValue(el, "text", edit.text);
      if (edit.style) applyElementTypography(el, edit.style);
      if (
        !el.hasAttribute("data-kn-user-applied") &&
        (edit.imageUrl || edit.href || effectiveHtml || (locale !== "en" && edit.text))
      ) {
        el.setAttribute("data-kn-user-applied", "1");
      }
    }
  }
}

export function elementEditLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = el.className?.toString().split(/\s+/).find((c) => c.includes("heading") || c.includes("content"));
  const preview = (el.textContent ?? "").trim().slice(0, 48);
  return [tag, cls, preview].filter(Boolean).join(" · ");
}
