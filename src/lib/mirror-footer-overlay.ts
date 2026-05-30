/** Mirror iframe — admin footer ayarları */

export type MirrorFooterColumn = {
  title: string;
  links: { href: string; label: string }[];
};

export type MirrorFooterData = {
  introHtml?: string;
  taglineHtml?: string;
  columns: MirrorFooterColumn[];
};

function footerLinkHtml(href: string, label: string): string {
  const h = href.replace(/"/g, "&quot;");
  const t = label.replace(/</g, "&lt;");
  return `<li class="footer--menu-item"><a href="${h}" class="footer--menu-link">${t}</a></li>`;
}

function setMenuHeading(heading: Element, title: string) {
  const icon = heading.querySelector(".accordion--icon, [data-accordion-icon]");
  heading.textContent = "";
  heading.append(document.createTextNode(`${title} `));
  if (icon) heading.append(icon);
}

export function applyMirrorFooter(doc: Document, footer: MirrorFooterData) {
  if (footer.introHtml?.trim()) {
    doc.querySelectorAll(".footer--text").forEach((el) => {
      el.innerHTML = footer.introHtml!.trim();
    });
  }

  if (footer.taglineHtml?.trim()) {
    doc
      .querySelectorAll(".footer--right-top .footer--heading, .footer--right-top .h6")
      .forEach((el) => {
        el.innerHTML = footer.taglineHtml!.trim();
      });
  }

  if (!footer.columns.length) return;

  const menus = doc.querySelectorAll(".footer--menu");
  footer.columns.forEach((col, idx) => {
    const menu = menus[idx];
    if (!menu) return;

    const heading = menu.querySelector(".footer--menu-heading, summary.footer--menu-heading");
    if (heading && col.title) setMenuHeading(heading, col.title);

    const ul = menu.querySelector("ul.footer--menu-list");
    if (ul && col.links.length) {
      ul.innerHTML = col.links.map((l) => footerLinkHtml(l.href, l.label)).join("");
    }
  });
}
