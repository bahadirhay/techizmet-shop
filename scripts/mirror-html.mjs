/**
 * HTTrack mirror HTML → yerel tema yolları + Next.js rotaları
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const MIRROR_BASE = "/theme/techizmet-shop/";

export function buildAssetResolver(themeRoot) {
  const byDir = new Map();
  const fileSet = new Set();

  for (const sub of ["cdn/shop/files", "cdn/shop/collections"]) {
    const dir = join(themeRoot, sub);
    if (!existsSync(dir)) continue;
    const names = readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile());
    byDir.set(sub, names);
    for (const n of names) fileSet.add(`${sub}/${n}`);
  }

  function pickBest(sub, requested) {
    const names = byDir.get(sub);
    if (!names) return null;
    if (fileSet.has(`${sub}/${requested}`)) return requested;

    const q = requested.indexOf("?");
    const base = q >= 0 ? requested.slice(0, q) : requested;
    const ext = base.includes(".") ? base.slice(base.lastIndexOf(".")) : "";
    const stem = ext ? base.slice(0, -ext.length) : base;

    const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const httrackRe = new RegExp(`^${escapedStem}[0-9a-f]*${escapedExt}$`, "i");
    const candidates = names.filter((n) => n === base || httrackRe.test(n));
    if (candidates.length === 0) return null;

    const dir = join(themeRoot, sub);
    candidates.sort(
      (a, b) => statSync(join(dir, b)).size - statSync(join(dir, a)).size
    );
    return candidates[0];
  }

  return { pickBest, fileSet };
}

function fixCdnAssetPaths(html, resolver, logLabel) {
  const re =
    /\/theme\/techizmet-shop\/(cdn\/shop\/(?:files|collections)\/)([^"'<\s]+)/g;
  let fixes = 0;
  const out = html.replace(re, (full, prefix, filename) => {
    const sub = prefix.replace(/\/$/, "");
    const q = filename.indexOf("?");
    const bare = q >= 0 ? filename.slice(0, q) : filename;
    const query = q >= 0 ? filename.slice(q) : "";
    const actual = resolver.pickBest(sub, bare);
    if (!actual || actual === bare) return full;
    fixes++;
    return `/theme/techizmet-shop/${sub}/${actual}${query}`;
  });
  if (fixes > 0) console.log(`[${logLabel}] ${fixes} görsel yolu düzeltildi`);
  return out;
}

const LOCALE_STYLE = `<style id="kn-mirror-locale-style">
.kn-iframe-locale{display:inline-flex;align-items:center;border:1px solid rgba(0,0,0,.2);border-radius:999px;overflow:hidden;font-size:11px;line-height:1;background:rgba(255,255,255,.92);box-shadow:0 1px 6px rgba(0,0,0,.08)}
.kn-iframe-locale button{padding:5px 11px;border:none;background:transparent;cursor:pointer;font:inherit;color:inherit}
.kn-iframe-locale button.is-active{background:#111;color:#fff}
.header--icons-list .header--icon-item.kn-locale-icon-item{display:flex;align-items:center;margin-right:6px}
.header--icons-list{display:flex;flex-wrap:nowrap;align-items:center;gap:2px}
.header--icons-list>.header--icon-item{flex:0 0 auto}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale{font-size:10px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button{padding:4px 8px}
.header--right{overflow:visible;min-width:0}
.header:not(.is-sticky).desktop-transparent:not(:hover) .header--icons-list .header--icon-link-text,
.header:not(.is-sticky).mobile-transparent:not(:hover) .header--icons-list .header--icon-link-text{color:var(--header_icon_color,#111);background:rgba(255,255,255,.92);box-shadow:0 1px 6px rgba(0,0,0,.08)}
.mobile--menu-footer .kn-iframe-locale{margin-top:8px}
.localization-form-popup{display:none!important}
.side-drawer.show{display:flex!important;pointer-events:all!important}
</style>`;

const LOCALE_MARKUP = `<div class="kn-iframe-locale localization-form" data-kn-locale-root role="group" aria-label="Dil">
  <button type="button" data-locale="tr">Türkçe</button>
  <button type="button" data-locale="en">English</button>
</div>`;

const STORE_BRIDGE = `<script id="kn-store-bridge">
(function () {
  function getLocale() {
    var m = document.cookie.match(/(?:^|;)\\s*shop_locale=([^;]+)/);
    return (m && m[1]) || "en";
  }
  function localeMarkup() {
    return '<div class="kn-iframe-locale localization-form" data-kn-locale-root role="group" aria-label="Dil"><button type="button" data-locale="tr">Türkçe</button><button type="button" data-locale="en">English</button></div>';
  }
  function relocateAccountDrawer() {
    var drawer = document.querySelector('account-drawer[data-drawer="account-drawer"]');
    if (!drawer || drawer.dataset.knRelocated) return;
    drawer.dataset.knRelocated = "1";
    document.body.appendChild(drawer);
  }
  function openDrawer(source) {
    if (source === "account-drawer") relocateAccountDrawer();
    var drawer = document.querySelector('[data-drawer="' + source + '"]');
    if (!drawer) return false;
    document.querySelectorAll("search-drawer,account-drawer,cart-drawer,mobile-menu,[data-drawer]").forEach(function (d) {
      d.removeAttribute("open");
      d.classList.remove("active", "is-active", "open", "show");
    });
    drawer.classList.add("show");
    drawer.setAttribute("open", "");
    document.body.classList.add("overflow-hidden");
    document.documentElement.classList.add("overflow-hidden");
    return true;
  }
  function bindLocale(root) {
    if (!root || root.dataset.knBound) return;
    root.dataset.knBound = "1";
    var cur = getLocale();
    root.querySelectorAll("[data-locale]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-locale") === cur);
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-locale");
        if (!next || next === cur) return;
        if (window.top !== window.self) {
          window.top.postMessage({ type: "kn-set-locale", locale: next }, "*");
          return;
        }
        fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        }).then(function () { window.location.reload(); });
      });
    });
  }
  function navItemHtml(it) {
    return (
      '<li class="header--menu-item"><a href="' +
      it.href +
      '" class="header--menu-link heading-font text-small">' +
      (it.label || it.labelEn) +
      "</a></li>"
    );
  }
  function applyNav(nav) {
    if (!nav || !nav.length) return;
    document.querySelectorAll("ul.header--navigation-list").forEach(function (ul) {
      ul.innerHTML = nav.map(navItemHtml).join("");
    });
    document.querySelectorAll(".no-js-menu nav > ul").forEach(function (ul) {
      ul.innerHTML = nav
        .map(function (it) {
          return '<li><a class="header--menu-link" href="' + it.href + '">' + (it.label || it.labelEn) + "</a></li>";
        })
        .join("");
    });
  }
  document.querySelectorAll("[data-kn-locale-root]").forEach(bindLocale);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", relocateAccountDrawer);
  } else {
    relocateAccountDrawer();
  }
  fetch("/api/store/bootstrap")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.nav) applyNav(d.nav);
      document.querySelectorAll("[data-kn-locale-root]").forEach(bindLocale);
    })
    .catch(function () {});
  document.addEventListener("click", function (e) {
    var listSet = e.target && e.target.closest ? e.target.closest("list-set[data-behaviour='drawer']") : null;
    if (listSet) {
      e.preventDefault();
      e.stopPropagation();
      openDrawer(listSet.getAttribute("data-source") || "");
      return;
    }
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.closest("account-drawer")) return;
    var href = a.getAttribute("href") || "";
    if (href === "#" || href.indexOf("search.html") >= 0) {
      e.preventDefault();
      openDrawer("search-drawer");
      return;
    }
    if (!href || href.charAt(0) !== "/" || href.indexOf("/theme/") === 0) return;
    if (window.top === window.self) return;
    e.preventDefault();
    window.top.location.href = href;
  }, true);
  function closeDrawers() {
    document.querySelectorAll("[data-drawer]").forEach(function (d) {
      d.removeAttribute("open");
      d.classList.remove("active", "is-active", "open", "show");
    });
    document.body.classList.remove("overflow-hidden");
    document.documentElement.classList.remove("overflow-hidden");
  }
  document.querySelectorAll("[data-close-drawer],[data-drawer-close]").forEach(function (btn) {
    btn.addEventListener("click", closeDrawers);
  });
})();
</script>`;

function injectLocaleSwitcher(html) {
  let h = html;
  h = h.replace(/<li class="header--menu-item" data-kn-locale-menu="header">[\s\S]*?<\/li>/g, "");
  if (!h.includes("kn-locale-icon-item")) {
    h = h.replace(
      /<li class="header--icon-item search">/,
      `<li class="header--icon-item kn-locale-icon-item">${LOCALE_MARKUP}</li>\n        <li class="header--icon-item search">`
    );
  }
  h = h.replace(
    /(<li class="header--icon-item search">[\s\S]*?<\/list-set>)(\s*)(<li class="header--icon-item account[^>]*>)/g,
    "$1</li>$2$3"
  );
  h = h.replace(
    /(<list-set[^>]*data-source="search-drawer"[^>]*>[\s\S]*?<a[^>]*href=")[^"]*search[^"]*(")/gi,
    '$1#$2'
  );
  h = h.replace(
    /(<list-set[^>]*data-source="account-drawer"[^>]*>[\s\S]*?<a[^>]*href=")[^"]*(")/gi,
    '$1#$2'
  );
  h = h.replace(/<localization-context[\s\S]*?<\/localization-context>/gi, LOCALE_MARKUP);
  if (!h.includes("kn-mirror-locale-style")) {
    h = h.replace(/<\/head>/i, `${LOCALE_STYLE}\n</head>`);
  }
  return h;
}

/** @param {string} html */
export function applyMirrorTurkishStrings(html) {
  const pairs = [
    ["Home", "Ana Sayfa"],
    ["Best Sellers", "Çok Satanlar"],
    ["Collections", "Koleksiyonlar"],
    ["About", "Hakkımızda"],
    ["Contact", "İletişim"],
    ["Login", "Giriş"],
    ["Shop Now!", "Hemen Al!"],
    ["Continue Shopping", "Alışverişe devam"],
    ["All collections", "Tüm koleksiyonlar"],
    [
      "Free shipping on orders over €300 / $300 / £240",
      "300 TL üzeri siparişlerde ücretsiz kargo",
    ],
    [
      "Brightening Vitamin C Serum – ",
      "Aydınlatıcı C Vitamini Serumu – ",
    ],
  ];
  let out = html;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

/** Ürün sayfaları ../../cdn/ kullanır; tek ../cdn/ dönüşümü //theme/... üretir */
function normalizeBrokenMirrorPaths(html) {
  let h = html;
  h = h.replace(/(?:\.\.\/)+(?=\/theme\/techizmet-shop\/)/g, "");
  h = h.replace(/(?:\.\.\/)+theme\/techizmet-shop\//gi, "/theme/techizmet-shop/");
  h = h.replace(/\/\/+theme\/techizmet-shop\//gi, "/theme/techizmet-shop/");
  h = h.replace(/(href|src|content|data-src)="\/\/theme/gi, '$1="/theme');
  h = h.replace(/(href|src|content|data-src)='\/\/theme/gi, "$1='/theme");
  return h;
}

export function rewriteMirrorHtml(raw, resolver, logLabel = "mirror-html") {
  const BASE = MIRROR_BASE;
  const relCdn = /(?:\.\.\/)+cdn\//g;
  const relCdnShopify = /(?:\.\.\/)+cdn\.shopify\.com\//g;
  let h = raw;

  h = h.replace(relCdn, `${BASE}cdn/`);
  h = h.replace(relCdnShopify, `${BASE}cdn.shopify.com/`);

  const cdnAttrs = ["href", "src", "data-src", "data-original", "content"];
  for (const attr of cdnAttrs) {
    h = h.replace(new RegExp(`${attr}="cdn\\/`, "g"), `${attr}="${BASE}cdn/`);
    h = h.replace(new RegExp(`${attr}='cdn\\/`, "g"), `${attr}='${BASE}cdn/`);
  }
  h = h.replace(/srcset="cdn\//g, `srcset="${BASE}cdn/`);
  h = h.replace(/srcset='cdn\//g, `srcset='${BASE}cdn/`);
  h = h.replace(/srcset="(?:\.\.\/)+cdn\//g, `srcset="${BASE}cdn/`);
  h = h.replace(/url\(\s*"?cdn\//g, `url("${BASE}cdn/`);
  h = h.replace(/url\(\s*'cdn\//g, `url('${BASE}cdn/`);
  h = h.replace(/url\(\s*"(?:\.\.\/)+cdn\//g, `url("${BASE}cdn/`);

  h = h.replace(/\/\/theking-noor\.myshopify\.com\/cdn\//g, `${BASE}cdn/`);
  h = h.replace(/https:\/\/theking-noor\.myshopify\.com\/cdn\//g, `${BASE}cdn/`);
  h = h.replace(/http:\/\/theking-noor\.myshopify\.com\/cdn\//g, `${BASE}cdn/`);

  h = h.replace(/href="(?:\.\.\/)+en-us\.html"/gi, 'href="/"');
  h = h.replace(/href='(?:\.\.\/)+en-us\.html'/gi, "href='/'");
  h = h.replace(/href="(?:\.\.\/)+collections\.html"/gi, 'href="/collections"');
  h = h.replace(/href='(?:\.\.\/)+collections\.html'/gi, "href='/collections'");
  h = h.replace(
    /Shopify\.routes\.root\s*=\s*"(?:\.\.\/)+[^"]*"/g,
    'Shopify.routes.root = "/"'
  );
  h = h.replace(/href="en-us\/collections\.html"/gi, 'href="/collections"');
  h = h.replace(/href="en-us\.html"/g, 'href="/"');
  h = h.replace(/href="en-us\//g, 'href="/');
  h = h.replace(/href='\.\/en-us\.html'/g, "href='/'");
  h = h.replace(/href="collections\.html"/gi, 'href="/collections"');
  h = h.replace(/href="\/collections\.html"/gi, 'href="/collections"');

  h = h.replace(
    /href="(?:\.\.\/)*products\/([^"?#]+)\.html"/gi,
    'href="/products/$1"'
  );
  h = h.replace(
    /href='(?:\.\.\/)*products\/([^"'?#]+)\.html'/gi,
    'href="/products/$1"'
  );
  h = h.replace(
    /href="(?:\.\.\/)*collections\/([^"?#]+)\.html"/gi,
    'href="/collections/$1"'
  );
  h = h.replace(
    /href='(?:\.\.\/)*collections\/([^"'?#]+)\.html'/gi,
    'href="/collections/$1"'
  );
  h = h.replace(
    /href="(?:\.\.\/)*pages\/([^"?#]+)\.html"/gi,
    'href="/pages/$1"'
  );
  h = h.replace(
    /href='(?:\.\.\/)*pages\/([^"'?#]+)\.html'/gi,
    'href="/pages/$1"'
  );
  h = h.replace(/href="collections\/all\.html"/gi, 'href="/collections/all"');
  h = h.replace(/href="collections\/all[0-9a-f]*\.html"/gi, 'href="/collections/all"');
  h = h.replace(/href="\/collections\/([^"?#]+)\.html"/gi, 'href="/collections/$1"');
  h = h.replace(/href="\/products\/([^"?#]+)\.html"/gi, 'href="/products/$1"');
  h = h.replace(/href="\/pages\/([^"?#]+)\.html"/gi, 'href="/pages/$1"');

  h = h.replace(/<form[^>]*action="[^"]*myshopify[^"]*"[^>]*>/gi, '<form action="#" onsubmit="return false">');

  h = h.replace(/<script[^>]*src="[^"]*shopifycloud\/portable-wallets[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*checkouts\/internal[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*storefront-banner[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*load_feature[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*compiled_assets\/scripts[^"]*"[^>]*><\/script>/gi, "");
  /** HTTrack’te yok — konsolda 404 ve module specifier hatası */
  h = h.replace(
    /<script defer="defer" async type="module" src="[^"]*shop-js[^"]*"[^>]*><\/script>/gi,
    "",
  );
  h = h.replace(
    /<script type="module">\s*await import\("cdn\/shopifycloud\/shop-js[^<]*<\/script>/gis,
    "",
  );
  h = h.replace(/<script[^>]*src="[^"]*shopifycloud\/shop-js[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*origin_trials[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*trekkie\.storefront[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*shop_events_listener[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*shopify-perf-kit[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<script[^>]*src="[^"]*\/mirror\/cdn[^"]*"[^>]*><\/script>/gi, "");
  h = h.replace(/<link[^>]*model-viewer-ui[^>]*>/gi, "");

  h = h.replace(/<base[^>]*>/gi, "");

  h = injectLocaleSwitcher(h);
  h = fixCdnAssetPaths(h, resolver, logLabel);
  h = normalizeBrokenMirrorPaths(h);

  if (!h.includes("kn-store-bridge")) {
    h = h.replace(/<\/body>/i, `${STORE_BRIDGE}\n</body>`);
  }

  return h;
}
