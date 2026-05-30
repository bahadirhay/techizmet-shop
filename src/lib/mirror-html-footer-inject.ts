import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function footerLinksHtml(links: { href: string; label: string }[]) {
  return links
    .map(
      (l) =>
        `<li class="footer--menu-item"><a href="${escHtml(l.href)}" class="footer--menu-link">${escHtml(l.label)}</a></li>`,
    )
    .join("");
}

function markHtmlDataset(html: string, key: string): string {
  const attr = `data-${key}="1"`;
  if (html.includes(attr)) return html;
  return html.replace(/<html\b([^>]*)>/i, (_m, attrs) => `<html ${attr}${attrs}>`);
}

/** Sunucu — mirror HTML’e footer (ilk boyamada Türkçe) */
export function injectFooterIntoMirrorHtml(html: string, footer: MirrorFooterData): string {
  let out = html;
  const hasContent =
    !!footer.introHtml?.trim() ||
    !!footer.taglineHtml?.trim() ||
    footer.columns.length > 0;

  if (hasContent) {
    out = markHtmlDataset(out, "kn-footer-server");
  }

  if (footer.introHtml?.trim()) {
    out = out.replace(
      /(<div class="footer--text">\s*)[\s\S]*?(\s*<\/div>)/i,
      `$1${footer.introHtml.trim()}$2`,
    );
  }

  if (footer.taglineHtml?.trim()) {
    out = out.replace(
      /(<div class="h6 heading-font footer--heading">\s*)[\s\S]*?(\s*<\/div>)/i,
      `$1${footer.taglineHtml.trim()}$2`,
    );
  }

  if (!footer.columns.length) return out;

  const menuBlocks = [...out.matchAll(/<details\s+class="footer--menu[\s\S]*?<\/details>/gi)];
  footer.columns.forEach((col, idx) => {
    const block = menuBlocks[idx]?.[0];
    if (!block) return;

    let next = block;
    if (col.title) {
      next = next.replace(
        /(<summary[^>]*class="footer--menu-heading[^"]*"[^>]*>)\s*[\s\S]*?(\s*<span class="accordion--icon)/i,
        `$1\n                                      ${escHtml(col.title)}\n                                      $2`,
      );
    }
    if (col.links.length) {
      next = next.replace(
        /(<ul class="footer--menu-list"[^>]*>)[\s\S]*?(<\/ul>)/i,
        `$1${footerLinksHtml(col.links)}$2`,
      );
    }
    out = out.replace(block, next);
  });

  return out;
}
