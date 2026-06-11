const NAV_DROPDOWN_CSS = "/theme/techizmet-shop/kn-nav-dropdown.css?v=29";
const MIRROR_HERO_CSS = "/theme/techizmet-shop/kn-mirror-hero.css?v=1";
const MOBILE_MENU_CSS = "/theme/techizmet-shop/kn-mobile-menu.css?v=5";
const BLOG_CARDS_CSS = "/theme/techizmet-shop/kn-blog-cards.css?v=2";

/** İstemci — vitrin iframe’e layout CSS (hero + nav) */
export function ensureMirrorLayoutStyles(doc: Document) {
  const head = doc.head;
  if (!head) return;
  if (!doc.getElementById("kn-nav-dropdown-css")) {
    const nav = doc.createElement("link");
    nav.id = "kn-nav-dropdown-css";
    nav.rel = "stylesheet";
    nav.href = NAV_DROPDOWN_CSS;
    head.appendChild(nav);
  }
  if (!doc.getElementById("kn-mirror-hero-css")) {
    const hero = doc.createElement("link");
    hero.id = "kn-mirror-hero-css";
    hero.rel = "stylesheet";
    hero.href = MIRROR_HERO_CSS;
    head.appendChild(hero);
  }
  const mobileExisting = doc.getElementById("kn-mobile-menu-css") as HTMLLinkElement | null;
  if (mobileExisting) {
    mobileExisting.href = MOBILE_MENU_CSS;
  } else {
    const mobile = doc.createElement("link");
    mobile.id = "kn-mobile-menu-css";
    mobile.rel = "stylesheet";
    mobile.href = MOBILE_MENU_CSS;
    head.appendChild(mobile);
  }
  if (!doc.getElementById("kn-blog-cards-css")) {
    const blog = doc.createElement("link");
    blog.id = "kn-blog-cards-css";
    blog.rel = "stylesheet";
    blog.href = BLOG_CARDS_CSS;
    head.appendChild(blog);
  }
}

export function injectMirrorNavDropdownStyles(html: string): string {
  let out = html;
  if (out.includes("kn-nav-dropdown.css")) {
    out = out.replace(/kn-nav-dropdown\.css\?v=\d+/g, "kn-nav-dropdown.css?v=29");
  }
  if (out.includes("kn-mobile-menu.css")) {
    out = out.replace(/kn-mobile-menu\.css\?v=\d+/g, "kn-mobile-menu.css?v=5");
  }
  if (!out.includes("kn-nav-dropdown.css")) {
    const link = `<link rel="stylesheet" href="${NAV_DROPDOWN_CSS}" id="kn-nav-dropdown-css" />`;
    out = out.replace(/<\/head>/i, `${link}\n</head>`);
  }
  if (!out.includes("kn-mirror-hero.css")) {
    const heroLink = `<link rel="stylesheet" href="${MIRROR_HERO_CSS}" id="kn-mirror-hero-css" />`;
    out = out.replace(/<\/head>/i, `${heroLink}\n</head>`);
  }
  if (!out.includes("kn-mobile-menu.css")) {
    const mobileLink = `<link rel="stylesheet" href="${MOBILE_MENU_CSS}" id="kn-mobile-menu-css" />`;
    out = out.replace(/<\/head>/i, `${mobileLink}\n</head>`);
  }
  if (!out.includes("kn-blog-cards.css")) {
    const blogLink = `<link rel="stylesheet" href="${BLOG_CARDS_CSS}" id="kn-blog-cards-css" />`;
    out = out.replace(/<\/head>/i, `${blogLink}\n</head>`);
  }
  return out;
}
