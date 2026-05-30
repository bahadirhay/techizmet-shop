import type { ShopBlock } from "@/lib/blocks/schema";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const INJECT_STYLES = `
#kn-custom-blocks-injected{margin:0;padding:24px 16px;max-width:1200px;margin-left:auto;margin-right:auto}
#kn-custom-blocks-injected .kn-cb-section{margin:0 0 28px}
#kn-custom-blocks-injected .kn-cb-text{text-align:var(--kn-cb-align,left);line-height:1.6}
#kn-custom-blocks-injected .kn-cb-text h1,#kn-custom-blocks-injected .kn-cb-text h2,#kn-custom-blocks-injected .kn-cb-text h3{margin:0 0 .5em}
#kn-custom-blocks-injected .kn-cb-actions{text-align:var(--kn-cb-align,center);margin:16px 0}
#kn-custom-blocks-injected .kn-cb-img{display:block;max-width:100%;height:auto;margin:0 auto}
#kn-custom-blocks-injected .kn-cb-img--round{border-radius:12px}
#kn-custom-blocks-injected .kn-cb-slider{position:relative;overflow:hidden;border-radius:8px}
#kn-custom-blocks-injected .kn-cb-slide img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
#kn-custom-blocks-injected .kn-cb-slide-caption{padding:16px;background:#111;color:#fff}
`;

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
    case "productGrid":
      return `<div class="kn-cb-section kn-cb-text" style="--kn-cb-align:center"><p><strong>${esc(block.props.title ?? "Ürünler")}</strong> — vitrinde ürün listesi için /collections veya blok modu ana sayfayı kullanın.</p></div>`;
    default:
      return "";
  }
}

/** Mirror #MainContent üstüne enjekte edilecek HTML */
export function buildMirrorCustomBlocksHtml(blocks: ShopBlock[]): string {
  if (!blocks.length) return "";
  const parts = blocks.map(blockToHtml).filter(Boolean);
  if (!parts.length) return "";
  return `<style>${INJECT_STYLES}</style><div id="kn-custom-blocks-injected">${parts.join("")}</div>`;
}

export function applyCustomBlocksInject(doc: Document, blocks: ShopBlock[]) {
  const main = doc.getElementById("MainContent");
  if (!main) return;
  main.querySelector("#kn-custom-blocks-injected")?.remove();
  const html = buildMirrorCustomBlocksHtml(blocks);
  if (!html) return;
  const wrap = doc.createElement("div");
  wrap.innerHTML = html;
  const injected = wrap.querySelector("#kn-custom-blocks-injected");
  if (injected) main.insertBefore(injected, main.firstChild);
  const style = wrap.querySelector("style");
  if (style) doc.head.appendChild(style);
}
