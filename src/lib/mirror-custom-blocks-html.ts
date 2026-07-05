import type { ShopBlock } from "@/lib/blocks/schema";
import {
  MIRROR_WIDGET_TOP,
  type MirrorCustomBlockEntry,
} from "@/lib/mirror-custom-block-types";
import { featureCardIconHtml, type FeatureCardIconKey } from "@/lib/feature-cards-icons";
import { FEATURE_CARDS_WIDGET_CSS } from "@/lib/feature-cards-styles";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Theme shell — iframe <head> yerine React kabuğunda yüklenir */
export const MIRROR_CUSTOM_BLOCK_STYLES = `
.kn-custom-block-root{position:relative;z-index:2}
.kn-custom-block-root.kn-cb-text{color:#111!important}
.kn-custom-block-root.kn-cb-text h1,.kn-custom-block-root.kn-cb-text h2,.kn-custom-block-root.kn-cb-text h3,.kn-custom-block-root.kn-cb-text p{color:inherit!important}
.kn-custom-block-root.kn-cb-section:not(.kn-cb-feature-cards){margin:0 0 28px;padding:0 16px;max-width:1200px;margin-left:auto;margin-right:auto}
.kn-custom-block-root.kn-cb-section.kn-cb-map--full{padding:0!important;max-width:100%!important;width:100%!important;margin-left:0!important;margin-right:0!important;border-radius:0!important;border:none!important;overflow:hidden!important}
.kn-custom-block-root.kn-cb-section.kn-cb-hidden{display:none!important}
.kn-custom-block-root.kn-cb-text{text-align:var(--kn-cb-align,left);line-height:1.6}
.kn-custom-block-root.kn-cb-text h1,.kn-custom-block-root.kn-cb-text h2,.kn-custom-block-root.kn-cb-text h3{margin:0 0 .5em}
.kn-custom-block-root.kn-cb-actions{text-align:var(--kn-cb-align,center);margin:16px 0}
.kn-custom-block-root.kn-cb-img{display:block;max-width:100%;height:auto;margin:0 auto}
.kn-custom-block-root.kn-cb-img--round{border-radius:12px}
.kn-custom-block-root.kn-cb-slider{position:relative;overflow:hidden;border-radius:8px}
.kn-custom-block-root.kn-cb-slide img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
.kn-custom-block-root.kn-cb-slide-caption{padding:16px;background:#111;color:#fff}
.kn-custom-block-root.kn-cb-split{display:grid;gap:20px;align-items:center}
@media(min-width:768px){.kn-custom-block-root.kn-cb-split{grid-template-columns:1fr 1fr}}
.kn-custom-block-root.kn-cb-marquee{overflow:hidden;white-space:nowrap;padding:12px 0;background:#111;color:#fff;text-align:center}
${FEATURE_CARDS_WIDGET_CSS}
`;

function featureIconHtml(item: {
  iconUrl?: string;
  iconKey?: FeatureCardIconKey;
  iconText?: string;
}): string {
  if (item.iconUrl?.trim()) {
    return `<div class="kn-fc-icon"><img src="${esc(item.iconUrl.trim())}" alt="" width="48" height="48" loading="lazy" /></div>`;
  }
  if (item.iconKey) {
    return featureCardIconHtml(item.iconKey);
  }
  if (item.iconText?.trim()) {
    return `<div class="kn-fc-icon kn-fc-icon--text">${esc(item.iconText.trim())}</div>`;
  }
  return `<div class="kn-fc-icon"></div>`;
}

function featureCardItemHtml(item: {
  iconUrl?: string;
  iconKey?: FeatureCardIconKey;
  iconText?: string;
  heading: string;
  description: string;
  linkHref?: string;
}): string {
  const icon = featureIconHtml(item);
  const title = `<h3>${esc(item.heading)}</h3>`;
  const body = `<p>${esc(item.description)}</p>`;
  if (item.linkHref?.trim()) {
    return `<a href="${esc(item.linkHref.trim())}" class="kn-fc-card">${icon}${title}${body}</a>`;
  }
  return `<article class="kn-fc-card">${icon}${title}${body}</article>`;
}

function blockToHtml(block: ShopBlock): string {
  switch (block.type) {
    case "text": {
      const tag = block.props.as ?? "p";
      const align = block.props.align ?? "left";
      const inner = esc(block.props.content);
      return `<div class="kn-cb-section kn-cb-text" style="--kn-cb-align:${align}"><${tag}>${inner}</${tag}></div>`;
    }
    case "button": {
      const align = block.props.align ?? "center";
      const cls =
        block.props.variant === "outline"
          ? "button button--secondary"
          : "button button--primary";
      return `<div class="kn-cb-section kn-cb-actions" style="--kn-cb-align:${align}"><a href="${esc(block.props.href)}" class="${cls}"><span class="button--text">${esc(block.props.label)}</span></a></div>`;
    }
    case "image": {
      const src = esc(block.props.src);
      if (!src) return "";
      const alt = esc(block.props.alt ?? "");
      const round = block.props.rounded !== false ? " kn-cb-img--round" : "";
      const img = `<img class="kn-cb-img${round}" src="${src}" alt="${alt}" loading="lazy" />`;
      if (block.props.href?.trim()) {
        return `<div class="kn-cb-section"><a href="${esc(block.props.href.trim())}">${img}</a></div>`;
      }
      return `<div class="kn-cb-section">${img}</div>`;
    }
    case "heroSlider": {
      const slide = block.props.slides[0];
      if (!slide) return "";
      const img = slide.imageUrl
        ? `<img src="${esc(slide.imageUrl)}" alt="" loading="lazy" />`
        : "";
      const cta =
        slide.ctaHref && slide.ctaLabel
          ? `<a href="${esc(slide.ctaHref)}" class="button button--primary"><span class="button--text">${esc(slide.ctaLabel)}</span></a>`
          : "";
      return `<div class="kn-cb-section kn-cb-slider"><div class="kn-cb-slide">${img}<div class="kn-cb-slide-caption"><h2>${esc(slide.headline)}</h2>${slide.subline ? `<p>${esc(slide.subline)}</p>` : ""}${cta}</div></div></div>`;
    }
    case "announcementBar":
      return `<div class="kn-cb-section kn-cb-text" style="--kn-cb-align:center;background:#111;color:#fff;padding:12px 16px;border-radius:8px"><p>${esc(block.props.text)}${block.props.linkHref && block.props.linkLabel ? ` — <a href="${esc(block.props.linkHref)}" style="color:#fff;text-decoration:underline">${esc(block.props.linkLabel)}</a>` : ""}</p></div>`;
    case "promoMarquee":
      return `<div class="kn-cb-section kn-cb-marquee">${esc(block.props.text)}</div>`;
    case "imageTextSplit": {
      const img = block.props.imageUrl
        ? `<img class="kn-cb-img kn-cb-img--round" src="${esc(block.props.imageUrl)}" alt="${esc(block.props.imageAlt ?? "")}" loading="lazy" />`
        : "";
      const cta =
        block.props.ctaHref && block.props.ctaLabel
          ? `<a href="${esc(block.props.ctaHref)}" class="button button--primary"><span class="button--text">${esc(block.props.ctaLabel)}</span></a>`
          : "";
      const bodyFirst = block.props.imagePosition === "right";
      return `<div class="kn-cb-section kn-cb-split">${bodyFirst ? `<div><h2>${esc(block.props.title)}</h2><p>${esc(block.props.body)}</p>${cta}</div>${img}` : `${img}<div><h2>${esc(block.props.title)}</h2><p>${esc(block.props.body)}</p>${cta}</div>`}</div>`;
    }
    case "testimonials": {
      const item = block.props.items[0];
      if (!item) return "";
      return `<div class="kn-cb-section kn-cb-text" style="--kn-cb-align:center"><h3>${esc(block.props.title ?? "Yorumlar")}</h3><blockquote><p>“${esc(item.quote)}”</p><footer>— ${esc(item.name)}</footer></blockquote></div>`;
    }
    case "newsletter":
      return `<div class="kn-cb-section kn-cb-text" style="--kn-cb-align:center;padding:24px;background:#f7f5f2;border-radius:12px"><h3>${esc(block.props.title)}</h3>${block.props.subtitle ? `<p>${esc(block.props.subtitle)}</p>` : ""}<p><em>${esc(block.props.buttonLabel ?? "Kaydol")}</em></p></div>`;
    case "collectionGrid":
    case "productGrid":
      return `<div class="kn-cb-section kn-cb-text" style="--kn-cb-align:center"><p><strong>${esc(block.props.title ?? (block.type === "productGrid" ? "Ürünler" : "Koleksiyonlar"))}</strong> — liste için ilgili vitrin bölümünü kullanın.</p></div>`;
    case "featureCards": {
      const bg = block.props.backgroundColor?.trim() || "#faf7f2";
      const subtitle = block.props.subtitle?.trim()
        ? `<p>${esc(block.props.subtitle)}</p>`
        : "";
      const cards = block.props.items.map((item) => featureCardItemHtml(item)).join("");
      return `<div class="kn-cb-section kn-cb-feature-cards" style="background:${esc(bg)}"><div class="kn-fc-header"><h2>${esc(block.props.title)}</h2>${subtitle}</div><div class="kn-fc-grid">${cards}</div></div>`;
    }
    case "map": {
      const url =
        block.props.embedUrl?.trim() ||
        (block.props.address?.trim()
          ? `https://maps.google.com/maps?q=${encodeURIComponent(block.props.address.trim())}&output=embed`
          : "");
      if (!url) return "";
      const h = block.props.height ?? 400;
      const fw = block.props.fullWidth;
      const wrapStyle = fw ? `` : `overflow:hidden;border-radius:12px;border:1px solid #e4e4e7`;
      return `<div class="kn-cb-section kn-cb-map${fw ? " kn-cb-map--full" : ""}"${wrapStyle ? ` style="${wrapStyle}"` : ""}><iframe title="Harita" src="${esc(url)}" width="100%" height="${h}" style="border:none;display:block;width:100%" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
    }
    default:
      return "";
  }
}

function sectionAnchorEl(doc: Document, anchor: string): Element | null {
  if (anchor === MIRROR_WIDGET_TOP) return null;
  return doc.querySelector(`section[id$="__${anchor}"]`);
}

function createWidgetElement(doc: Document, entry: MirrorCustomBlockEntry): Element | null {
  const inner = blockToHtml(entry.block);
  if (!inner) return null;
  const wrap = doc.createElement("div");
  wrap.innerHTML = inner;
  const section = wrap.querySelector(".kn-cb-section");
  if (!section) return null;
  section.classList.add("kn-custom-block-root");
  section.setAttribute("data-kn-custom-block", entry.id);
  if (entry.hidden) section.classList.add("kn-cb-hidden");
  return section;
}

/** Widget'ları seçilen bölüm konumlarına göre enjekte eder */
export function applyCustomBlocksInject(doc: Document, entries: MirrorCustomBlockEntry[]) {
  const main = doc.getElementById("MainContent");
  if (!main) return;

  main.querySelectorAll(".kn-custom-block-root").forEach((el) => el.remove());
  if (!doc.getElementById("kn-custom-blocks-css")) {
    const style = doc.createElement("style");
    style.id = "kn-custom-blocks-css";
    style.textContent = MIRROR_CUSTOM_BLOCK_STYLES;
    doc.head.appendChild(style);
  }

  const chainAfter = new Map<string, Element>();

  for (const entry of entries) {
    const el = createWidgetElement(doc, entry);
    if (!el) continue;

    const anchor = entry.insertAfterSection?.trim() || MIRROR_WIDGET_TOP;
    const chainKey = anchor === MIRROR_WIDGET_TOP ? MIRROR_WIDGET_TOP : anchor;

    const prev = chainAfter.get(chainKey);
    if (prev?.parentNode) {
      prev.parentNode.insertBefore(el, prev.nextSibling);
      chainAfter.set(chainKey, el);
      continue;
    }

    if (anchor === MIRROR_WIDGET_TOP) {
      const firstSection = main.querySelector("section.kn-mirror-section");
      if (firstSection?.parentNode) {
        firstSection.parentNode.insertBefore(el, firstSection);
      } else {
        main.appendChild(el);
      }
      chainAfter.set(chainKey, el);
      continue;
    }

    const section = sectionAnchorEl(doc, anchor);
    if (section?.parentNode) {
      section.parentNode.insertBefore(el, section.nextSibling);
      chainAfter.set(chainKey, el);
    } else {
      main.appendChild(el);
      chainAfter.set(chainKey, el);
    }
  }
}

/** @deprecated — tek kapsayıcı; artık bölüm bazlı kökler kullanılıyor */
export function buildMirrorCustomBlocksHtml(_blocks: ShopBlock[]): string {
  return "";
}
