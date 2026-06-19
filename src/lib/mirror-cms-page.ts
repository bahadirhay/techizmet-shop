import { parseHTML } from "@/lib/linkedom-server";
import type { ShopBlock } from "@/lib/blocks/schema";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cmsBlocksToHtml(blocks: ShopBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      const align = block.props.align ?? "left";
      const tag =
        block.props.as === "h1"
          ? "h1"
          : block.props.as === "h2"
            ? "h2"
            : block.props.as === "h3"
              ? "h3"
              : "p";
      parts.push(
        `<div class="kn-cms-block kn-align-${align}"><${tag} class="kn-cms-text">${escapeHtml(block.props.content)}</${tag}></div>`,
      );
      continue;
    }
    if (block.type === "button") {
      const align = block.props.align ?? "center";
      parts.push(
        `<div class="kn-cms-block kn-align-${align}"><a href="${escapeHtml(block.props.href)}" class="button medium-button">${escapeHtml(block.props.label)}</a></div>`,
      );
      continue;
    }
    if (block.type === "image" && block.props.src?.trim()) {
      const alt = escapeHtml(block.props.alt ?? "");
      const src = escapeHtml(block.props.src.trim());
      const img = `<img src="${src}" alt="${alt}" loading="lazy">`;
      parts.push(
        `<figure class="kn-cms-block kn-cms-figure">${block.props.href?.trim() ? `<a href="${escapeHtml(block.props.href.trim())}">${img}</a>` : img}</figure>`,
      );
    }
  }
  return parts.join("\n");
}

const CMS_PAGE_STYLE = `<style id="kn-cms-page-css">
.kn-cms-page {
  padding: 2.5rem 0 4rem;
}
.kn-cms-page .container-narrow {
  max-width: 48rem;
  margin: 0 auto;
  padding: 0 1.25rem;
}
.kn-cms-block + .kn-cms-block {
  margin-top: 1.25rem;
}
.kn-cms-text {
  margin: 0;
  line-height: 1.7;
}
.kn-align-center { text-align: center; }
.kn-align-left { text-align: left; }
.kn-align-right { text-align: right; }
.kn-cms-figure img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}
.kn-distance-sales-agreement { font-size: 0.9375rem; line-height: 1.65; }
.kn-dsa-title { text-align: center; font-size: 1.35rem; margin: 0 0 1rem; }
.kn-dsa-meta { margin: 0 0 1.5rem; }
.kn-distance-sales-agreement h2 { font-size: 1.05rem; margin: 1.75rem 0 0.75rem; }
.kn-distance-sales-agreement h3 { font-size: 0.98rem; margin: 1rem 0 0.5rem; }
.kn-dsa-table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 0.875rem; }
.kn-dsa-table th, .kn-dsa-table td { border: 1px solid rgba(0,0,0,.12); padding: 0.5rem 0.65rem; text-align: left; vertical-align: top; }
.kn-dsa-table th { width: 38%; background: rgba(0,0,0,.04); font-weight: 600; }
.kn-dsa-placeholder { color: #6b7280; font-style: italic; }
.kn-dsa-products { margin: 0.5rem 0 1rem; padding-left: 1.25rem; }
.kn-dsa-signatures { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,.1); }
</style>`;

export type MirrorCmsPagePayload = {
  title: string;
  blocks?: ShopBlock[];
  bodyHtml?: string;
};

/** About kabuğu — banner başlığı + CMS blok içeriği */
export function applyCmsPageToMirrorHtml(html: string, payload: MirrorCmsPagePayload): string {
  const { document } = parseHTML(html);

  document.title = payload.title.trim() || document.title;
  for (const meta of document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]')) {
    meta.setAttribute("content", payload.title.trim());
  }

  const bannerTitle = document.querySelector(
    "#MainContent .page--title, #MainContent h1.page--title, #MainContent h2.page--title",
  );
  if (bannerTitle) bannerTitle.textContent = payload.title.trim();

  const bannerDesc = document.querySelector("#MainContent .page--desc");
  if (bannerDesc) bannerDesc.remove();

  const main = document.getElementById("MainContent");
  if (main) {
    const banner = main.querySelector("section.page-banner, .page-banner");
    const cmsSection = document.createElement("section");
    cmsSection.className = "kn-mirror-section kn-cms-page";
    const inner = payload.bodyHtml?.trim() || cmsBlocksToHtml(payload.blocks ?? []);
    cmsSection.innerHTML = `<div class="section-wrapper section-spacing scheme-primary section-solid"><div class="container-narrow kn-cms-page-inner">${inner}</div></div>`;

    if (banner) {
      for (const child of [...main.children]) {
        if (child !== banner) child.remove();
      }
      main.appendChild(cmsSection);
    } else {
      main.innerHTML = cmsSection.outerHTML;
    }
  }

  if (!document.getElementById("kn-cms-page-css")) {
    const head = document.head;
    if (head) head.insertAdjacentHTML("beforeend", CMS_PAGE_STYLE);
  }

  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
