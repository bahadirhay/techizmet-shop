/** Ana sayfa — tıkla-düzenle: her metin / görsel / link */

import { isAnchorNode, isImageNode } from "@/lib/mirror-dom-node";

export type MirrorElementKind = "html" | "text" | "image" | "link";

export type MirrorElementEdit = {
  id: string;
  kind: MirrorElementKind;
  html?: string;
  text?: string;
  imageUrl?: string;
  href?: string;
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
  const el = section.querySelector(".revealing-text--content, [data-text-reveal]");
  if (!el || el.hasAttribute("data-kn-edit")) return 0;
  el.setAttribute("data-kn-edit", revealingTextElementId(sectionKey));
  el.setAttribute("data-kn-kind", "text");
  return 1;
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
    const sectionKey =
      section.id.match(/__([a-zA-Z0-9_]+)$/)?.[1] ??
      section.id.replace(/[^a-zA-Z0-9_]/g, "_").slice(-24) ??
      "revealing-text";
    n += stampRevealingTextSection(section, sectionKey);
  });

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
    const selKey = sel.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "el";
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
      const id = `${sectionKey}--${selKey}--${idx}`;
      const kind = forceTextSelectors.has(sel) ? "text" : inferKind(el);
      el.setAttribute("data-kn-edit", id);
      el.setAttribute("data-kn-kind", kind);
      n += 1;
    });
  }
  return n;
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

/** Admin katalog (section--heading) ↔ vitrin damgası (h2/p) uyumu */
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

function escapeEditId(id: string) {
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function findElementForEdit(doc: Document, editId: string): Element | null {
  const tryIds = [editId, ...mirrorElementEditAliases(editId)];
  for (const id of tryIds) {
    const el = doc.querySelector(`[data-kn-edit="${escapeEditId(id)}"]`);
    if (el) return el;
  }
  return null;
}

export function readElementValue(el: Element, kind: MirrorElementKind): string {
  if (kind === "image" && isImageNode(el)) {
    return el.getAttribute("data-original") ?? el.src ?? "";
  }
  if (kind === "link" && isAnchorNode(el)) return el.href ?? "";
  if (kind === "html") return el.innerHTML ?? "";
  return (el.textContent ?? "").trim();
}

export function applyElementValue(el: Element, kind: MirrorElementKind, value: string) {
  const v = value.trim();
  if (!v) return;
  if (kind === "image" && isImageNode(el)) {
    const bust = v.includes("?") ? `${v}&kn=1` : `${v}?kn=1`;
    el.src = bust;
    el.setAttribute("data-src", v);
    el.setAttribute("data-original", v);
    el.setAttribute("srcset", `${bust} 1x, ${bust} 2x`);
    el.removeAttribute("data-srcset");
    return;
  }
  if (kind === "link" && isAnchorNode(el)) {
    el.href = v;
    return;
  }
  if (kind === "html") {
    el.innerHTML = v;
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

export function applyMirrorElementEdits(
  doc: Document,
  edits: Record<string, MirrorElementEdit> | undefined,
) {
  if (!edits) return;
  stampMirrorEditableElements(doc);
  for (const edit of Object.values(edits)) {
    const el = findElementForEdit(doc, edit.id);
    if (!el) continue;
    if (edit.imageUrl) applyElementValue(el, "image", edit.imageUrl);
    else if (edit.href) applyElementValue(el, "link", edit.href);
    else if (edit.html) applyElementValue(el, "html", edit.html);
    else if (edit.text) applyElementValue(el, "text", edit.text);
    else continue;
  }
}

export function elementEditLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = el.className?.toString().split(/\s+/).find((c) => c.includes("heading") || c.includes("content"));
  const preview = (el.textContent ?? "").trim().slice(0, 48);
  return [tag, cls, preview].filter(Boolean).join(" · ");
}
