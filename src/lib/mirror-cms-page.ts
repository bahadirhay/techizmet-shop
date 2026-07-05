import { parseHTML } from "@/lib/linkedom-server";
import { resolveShopBlockForLocale } from "@/lib/blocks/locale";
import type { ShopBlock } from "@/lib/blocks/schema";
import type { ShopLocale } from "@/lib/i18n/locale";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cmsBlocksToHtml(blocks: ShopBlock[], locale: ShopLocale): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const b = resolveShopBlockForLocale(block, locale);
    if (b.type === "text") {
      const align = b.props.align ?? "left";
      const tag =
        b.props.as === "h1"
          ? "h1"
          : b.props.as === "h2"
            ? "h2"
            : b.props.as === "h3"
              ? "h3"
              : "p";
      parts.push(
        `<div class="kn-cms-block kn-align-${align}" data-kn-no-translate="1"><${tag} class="kn-cms-text">${escapeHtml(b.props.content)}</${tag}></div>`,
      );
      continue;
    }
    if (b.type === "button") {
      const align = b.props.align ?? "center";
      parts.push(
        `<div class="kn-cms-block kn-align-${align}" data-kn-no-translate="1"><a href="${escapeHtml(b.props.href)}" class="button medium-button">${escapeHtml(b.props.label)}</a></div>`,
      );
      continue;
    }
    if (b.type === "image" && b.props.src?.trim()) {
      const alt = escapeHtml(b.props.alt ?? "");
      const src = escapeHtml(b.props.src.trim());
      const img = `<img src="${src}" alt="${alt}" loading="lazy">`;
      parts.push(
        `<figure class="kn-cms-block kn-cms-figure">${b.props.href?.trim() ? `<a href="${escapeHtml(b.props.href.trim())}">${img}</a>` : img}</figure>`,
      );
    }
  }
  return parts.join("\n");
}

export const THEME_SHELL_CMS_PAGE_STYLE = `<style id="kn-cms-page-css">
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
.kn-cms-page .kn-distance-sales-agreement h1.kn-dsa-title {
  text-align: center;
  font-family: inherit !important;
  font-size: 1.15rem !important;
  font-weight: 600 !important;
  margin: 0 0 1rem;
}
.kn-cms-page .kn-distance-sales-agreement .kn-dsa-meta { margin: 0 0 1.5rem; }
.kn-cms-page .kn-distance-sales-agreement h2,
.kn-cms-page .kn-distance-sales-agreement h2.kn-dsa-h2 {
  font-family: inherit !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  margin: 1.25rem 0 0.5rem !important;
}
.kn-cms-page .kn-distance-sales-agreement h3,
.kn-cms-page .kn-distance-sales-agreement h3.kn-dsa-h3 {
  font-family: inherit !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  margin: 0.75rem 0 0.35rem !important;
}
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
export function applyCmsPageToMirrorHtml(
  html: string,
  payload: MirrorCmsPagePayload,
  locale: ShopLocale = "tr",
): string {
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
    const inner = payload.bodyHtml?.trim() || cmsBlocksToHtml(payload.blocks ?? [], locale);
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
    if (head) head.insertAdjacentHTML("beforeend", THEME_SHELL_CMS_PAGE_STYLE);
  }

  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
