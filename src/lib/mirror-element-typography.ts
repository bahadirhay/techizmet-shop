/** Vitrin metin alanları — hizalama, font, boyut, renk */

import { isElementNode } from "@/lib/mirror-dom-node";

export type MirrorTextAlign = "left" | "center" | "right";

export type MirrorFontPreset = "inherit" | "heading" | "accent" | "body";

export type MirrorElementTypography = {
  align?: MirrorTextAlign;
  fontPreset?: MirrorFontPreset;
  /** px/rem veya tema sınıfı: h2, h3, h4 … */
  fontSize?: string;
  color?: string;
};

const ALIGN_VALUES = new Set<MirrorTextAlign>(["left", "center", "right"]);
const FONT_PRESETS = new Set<MirrorFontPreset>(["inherit", "heading", "accent", "body"]);
const SIZE_CLASS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export function isMirrorMarqueeFieldId(id: string): boolean {
  return /--marquee-text--/i.test(id);
}

export function isMirrorHeadingFieldId(id: string): boolean {
  return /section--heading|section-heading|media-content-heading|image-with-text--heading|collection--heading|page--title|richtext-heading/i.test(
    id,
  );
}

export function hasMirrorTypography(style: MirrorElementTypography | undefined): boolean {
  if (!style) return false;
  return Boolean(style.align || style.fontPreset || style.fontSize || style.color);
}

export function sanitizeMirrorElementTypography(raw: unknown): MirrorElementTypography | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as MirrorElementTypography;
  const out: MirrorElementTypography = {};
  if (typeof s.align === "string" && ALIGN_VALUES.has(s.align as MirrorTextAlign)) {
    out.align = s.align;
  }
  if (typeof s.fontPreset === "string" && FONT_PRESETS.has(s.fontPreset as MirrorFontPreset)) {
    out.fontPreset = s.fontPreset;
  }
  if (typeof s.fontSize === "string") {
    const fs = s.fontSize.trim().slice(0, 16);
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(fs) || SIZE_CLASS.has(fs)) {
      out.fontSize = fs;
    }
  }
  if (typeof s.color === "string") {
    const c = s.color.trim();
    if (HEX_COLOR.test(c)) out.color = c.slice(0, 9);
  }
  return Object.keys(out).length ? out : undefined;
}

const FONT_PRESET_CLASSES = ["heading-font", "accent-font", "body-font"] as const;
const SIZE_CLASSES = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
const ALIGN_CLASSES = ["text-left", "text-center", "text-right"] as const;

type StyledElement = Element & {
  style: CSSStyleDeclaration;
  classList: DOMTokenList;
};

function asStyledElement(el: Element): StyledElement | null {
  if (!isElementNode(el)) return null;
  const node = el as StyledElement;
  if (!node.style || !node.classList) return null;
  return node;
}

function applySectionHeaderAlign(header: StyledElement, align: MirrorTextAlign) {
  header.classList.remove(...ALIGN_CLASSES);
  header.classList.add(
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right",
  );

  const withArrow =
    header.classList.contains("with--arrow") || header.classList.contains("with-button");

  if (withArrow) {
    if (align === "center") {
      header.style.setProperty("grid-template-columns", "1fr", "important");
      header.style.setProperty("justify-items", "center", "important");
      header.style.setProperty("text-align", "center", "important");
    } else if (align === "right") {
      header.style.setProperty("grid-template-columns", "1fr auto", "important");
      header.style.setProperty("justify-items", "end", "important");
      header.style.setProperty("text-align", "right", "important");
    } else {
      header.style.removeProperty("grid-template-columns");
      header.style.removeProperty("justify-items");
      header.style.removeProperty("text-align");
    }
    return;
  }

  header.style.textAlign = align;
}

function applyAlignToHost(host: StyledElement, align: MirrorTextAlign) {
  host.style.textAlign = align;
  const wrappers = [
    host.closest("variety-heading"),
    host.closest(".section--header-inner"),
    host.closest(".section--header"),
    host.closest(".page-banner--content"),
    host.closest(".image-with-text--content"),
  ];
  for (const wrap of wrappers) {
    const styled = wrap ? asStyledElement(wrap) : null;
    if (!styled) continue;
    if (styled.classList.contains("section--header")) {
      applySectionHeaderAlign(styled, align);
    } else {
      styled.classList.remove(...ALIGN_CLASSES);
      styled.classList.add(
        align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right",
      );
      styled.style.textAlign = align;
    }
  }
}

/** Vitrin DOM — kaydedilmiş tipografi uygula */
export function applyElementTypography(el: Element, style: MirrorElementTypography | undefined) {
  if (!style || !hasMirrorTypography(style)) return;
  const host = asStyledElement(el);
  if (!host) return;

  if (style.color) host.style.color = style.color;
  else host.style.removeProperty("color");

  if (style.fontSize) {
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(style.fontSize)) {
      host.style.fontSize = style.fontSize;
      for (const c of SIZE_CLASSES) host.classList.remove(c);
    } else if (SIZE_CLASS.has(style.fontSize)) {
      host.style.removeProperty("font-size");
      for (const c of SIZE_CLASSES) host.classList.remove(c);
      host.classList.add(style.fontSize);
    }
  } else {
    host.style.removeProperty("font-size");
  }

  if (style.fontPreset && style.fontPreset !== "inherit") {
    for (const c of FONT_PRESET_CLASSES) host.classList.remove(c);
    if (style.fontPreset === "heading") host.classList.add("heading-font");
    else if (style.fontPreset === "accent") host.classList.add("accent-font");
    else if (style.fontPreset === "body") host.classList.add("body-font");
  }

  if (style.align) applyAlignToHost(host, style.align);

  if (host.classList.contains("richtext--content")) {
    host.classList.remove("position-left", "position-center", "position-right", "text-left", "text-center", "text-right");
    if (style.align === "left") host.classList.add("position-left", "text-left");
    else if (style.align === "center") host.classList.add("position-center", "text-center");
    else if (style.align === "right") host.classList.add("position-right", "text-right");
  }
}
