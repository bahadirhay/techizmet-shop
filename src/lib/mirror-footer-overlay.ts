/** Mirror iframe — admin footer ayarları */

export type MirrorFooterColumn = {
  title: string;
  links: { href: string; label: string }[];
};

export type MirrorFooterData = {
  introHtml?: string;
  taglineHtml?: string;
  columns: MirrorFooterColumn[];
  bottomLinks?: { href: string; label: string }[];
  /** Undefined veya boş = hepsi görünür */
  paymentIcons?: string[];
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

function mirrorFooterDomReady(doc: Document): boolean {
  return Boolean(doc.querySelector(".section-footer, .footer--menu, .footer-quick-links"));
}

export function applyMirrorFooter(doc: Document, footer: MirrorFooterData) {
  if (!mirrorFooterDomReady(doc)) return false;
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

  if (footer.columns.length) {
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

  if (footer.bottomLinks?.length) {
    doc.querySelectorAll(".footer-quick-links").forEach((ul) => {
      ul.innerHTML = footer
        .bottomLinks!.map(
          (l) =>
            `<li><a href="${l.href.replace(/"/g, "&quot;")}" class="footer-quick-links-link text-small">${l.label.replace(/</g, "&lt;")}</a></li>`,
        )
        .join("");
    });
  }

  if (footer.paymentIcons !== undefined) {
    const allowed = new Set(footer.paymentIcons.map((s) => s.toLowerCase()));
    doc.querySelectorAll(".payment-icons .payment-icons-item").forEach((li) => {
      const title = li.querySelector("title")?.textContent?.toLowerCase() ?? "";
      const matches = [...allowed].some((id) => title.includes(id));
      (li as HTMLElement).style.display = matches ? "" : "none";
    });
  }

  return true;
}

/** Footer DOM geç gelirse birkaç kez dene */
export function scheduleMirrorFooterPatch(
  getDoc: () => Document | null | undefined,
  footer: MirrorFooterData,
): () => void {
  const delays = [0, 150, 500, 1200, 2500] as const;
  const timers = delays.map((ms) =>
    window.setTimeout(() => {
      const doc = getDoc();
      if (!doc) return;
      applyMirrorFooter(doc, footer);
    }, ms),
  );
  return () => timers.forEach((t) => window.clearTimeout(t));
}
