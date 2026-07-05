import type { ShopLocale } from "@/lib/i18n/locale";

export type MirrorBreadcrumbItem = { name: string; href: string; current?: boolean };

export const MIRROR_PRODUCT_BREADCRUMB_STYLE = `
.kn-mirror-breadcrumb {
  padding: 14px clamp(16px, 4vw, 40px) 8px;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(24, 24, 27, 0.55);
  background: transparent;
}
.kn-mirror-breadcrumb ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.kn-mirror-breadcrumb li:not(:last-child)::after {
  content: "›";
  margin-left: 6px;
  opacity: 0.45;
}
.kn-mirror-breadcrumb a {
  color: inherit;
  text-decoration: none;
}
.kn-mirror-breadcrumb a:hover {
  text-decoration: underline;
}
.kn-mirror-breadcrumb [aria-current="page"] {
  color: rgba(24, 24, 27, 0.85);
}
`;

/** Ürün adının hemen üstüne, mirror iframe içine breadcrumb */
export function injectMirrorProductBreadcrumb(
  doc: Document,
  items: MirrorBreadcrumbItem[],
  locale: ShopLocale = "tr",
): void {
  if (!items.length) return;
  const main = doc.getElementById("MainContent");
  if (!main || doc.getElementById("kn-mirror-breadcrumb")) return;

  if (!doc.getElementById("kn-mirror-breadcrumb-style")) {
    const style = doc.createElement("style");
    style.id = "kn-mirror-breadcrumb-style";
    style.textContent = MIRROR_PRODUCT_BREADCRUMB_STYLE;
    doc.head.appendChild(style);
  }

  const nav = doc.createElement("nav");
  nav.id = "kn-mirror-breadcrumb";
  nav.className = "kn-mirror-breadcrumb";
  nav.setAttribute("aria-label", locale === "tr" ? "Konum" : "Breadcrumb");

  const ol = doc.createElement("ol");
  for (const item of items) {
    const li = doc.createElement("li");
    if (item.current) {
      li.setAttribute("aria-current", "page");
      li.textContent = item.name;
    } else {
      const a = doc.createElement("a");
      a.href = item.href;
      a.textContent = item.name;
      li.appendChild(a);
    }
    ol.appendChild(li);
  }
  nav.appendChild(ol);
  main.insertBefore(nav, main.firstChild);
}
