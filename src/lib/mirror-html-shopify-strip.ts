/** Mirror HTML — eski mağaza (HTTrack) kalıntılarını temizle; harici Shopify istekleri yok */

const SHOPIFY_SCRIPT_SRC =
  /<script\b[^>]*\ssrc=["'][^"']*(?:shopifycloud|shopifycdn|trekkie\.storefront|shop_events_listener|privacy-banner|portable-wallets|shopify-perf-kit|origin_trials|monorail-edge|shop-js)[^"']*["'][^>]*>\s*<\/script>/gi;

const SHOPIFY_SCRIPT_IDS =
  /<script\b[^>]*\bid=["'](?:web-pixels-manager-setup|shop-js-analytics|scb4127|shopify-features|shopify-cfh-end)["'][^>]*>[\s\S]*?<\/script>/gi;

const ANALYTICS_BLOCK = /<script\b[^>]*\bclass=["']analytics["'][^>]*>[\s\S]*?<\/script>/gi;

const SHOPIFY_ATTRIBUTION =
  /<script\b[^>]*\bdata-source-attribution=["']shopify\.[^"']*["'][^>]*>[\s\S]*?<\/script>/gi;

const SHOPIFY_FEATURE_ASSETS =
  /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?Shopify\.featureAssets(?:(?!<\/script>)[\s\S])*?<\/script>/gi;

const PRODUCT_3D_MODEL =
  /<script\b[^>]*\ssrc=["'][^"']*product-3d-model[^"']*["'][^>]*>\s*<\/script>/gi;

const SHOPIFY_LOAD_FEATURES_BOOT =
  /<script\b[^>]*>\s*!function\(o\)\{function n\(\)\{var o=\[\];function n\(\)\{o\.push\(Array\.prototype\.slice\.apply\(arguments\)\)\}return n\.q=o,n\}var t=o\.Shopify=o\.Shopify\|\|\{\};t\.loadFeatures=n\(\),t\.autoloadFeatures=n\(\)\}\(window\);\s*<\/script>/gi;

const SHOPIFY_SIGN_IN =
  /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?Shopify\.SignInWithShop(?:(?!<\/script>)[\s\S])*?<\/script>/gi;

const SHOPIFY_ST = /<script\b[^>]*\bid=["']__st["'][^>]*>[\s\S]*?<\/script>/gi;

const SHOPIFY_MODULES =
  /<script\b[^>]*\btype=["']module["'][^>]*>\s*!function\(o\)\{\(o\.Shopify=o\.Shopify\|\|\{\}\)\.modules=!0\}\(window\);\s*<\/script>/gi;

const MONORAIL_BEACON =
  /<script\b[^>]*>\s*\(function\(\)\{if\s*\(\s*"sendBeacon"\s*in\s*navigator[\s\S]*?pagehide[\s\S]*?<\/script>/gi;

const TREKKIE_SHIM = /<script\b[^>]*>\s*window\.__TREKKIE_SHIM_QUEUE[\s\S]*?<\/script>/gi;

const CAPTCHA_BOOTSTRAP = /<script\b[^>]*\bid=["']captcha-bootstrap["'][^>]*>[\s\S]*?<\/script>/gi;

const SHOPIFY_ANALYTICS_META =
  /<script\b[^>]*>\s*window\.ShopifyAnalytics\s*=\s*window\.ShopifyAnalytics[\s\S]*?<\/script>/gi;

const SHOPIFY_PAYPAL = /<script\b[^>]*>\s*window\.ShopifyPaypalV4VisibilityTracking[\s\S]*?<\/script>/gi;

const SHOPIFY_ROUTES_BOOT =
  /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?Shopify\.routes\s*=(?:(?!<\/script>)[\s\S])*?<\/script>/gi;

const SHOPIFY_PERF_MARK =
  /<script\b[^>]*>\s*window\.performance[\s\S]*?shopify\.content_for_header[\s\S]*?<\/script>/gi;

const DNS_PREFETCH_SHOPIFY =
  /<link\b[^>]*\bhref=["']https?:\/\/[^"']*(?:shopify|myshopify|shopifysvc)[^"']*["'][^>]*>/gi;

const HTTRACK_MIRROR_COMMENT =
  /<!--\s*Mirrored from[^>]*(?:myshopify|shopify)[^>]*-->\s*/gi;

const META_SHOPIFY =
  /<meta[^>]*(?:name|id)=["'][^"']*shopify[^"']*["'][^>]*>/gi;

const STYLE_DATA_SHOPIFY = /<style\b[^>]*\bdata-shopify\b[^>]*>/gi;

const SHOPIFY_ACCEL_EL =
  /<shopify-accelerated-checkout\b[\s\S]*?<\/shopify-accelerated-checkout>/gi;

/** Tema JS uyumluluğu — harici Shopify servisi yok */
const THEME_COMPAT_STUB = `<script id="kn-theme-compat-stub">(function(){var g=window.Shopify=window.Shopify||{};var lf=function(){var q=[];function fn(){q.push([].slice.call(arguments));var cb=arguments[0]&&arguments[0][0]&&arguments[0][0].onLoad;if(typeof cb==="function")try{cb()}catch(e){}}fn.q=q;return fn;};g.loadFeatures=g.loadFeatures||lf();g.autoloadFeatures=g.autoloadFeatures||lf();g.routes=g.routes||{root:"/"};window.ShopifyAnalytics=window.ShopifyAnalytics||{meta:{},lib:{}};var t=window.ShopifyAnalytics.lib;["page","track","identify","ready","trackForm","trackLink"].forEach(function(m){t[m]=t[m]||function(){}});window.trekkie=window.trekkie||[];window.trekkie.load=function(){};window.trekkie.ready=function(fn){if(typeof fn==="function")try{fn()}catch(e){}};window.webPixelsManager=window.webPixelsManager||{init:function(){return{publishCustomEvent:function(){},visitor:function(){return{}}}}};})();</script>`;

export const KN_THEME_COMPAT_STUB_ID = "kn-theme-compat-stub";

/** @deprecated kn-shopify-stub — geriye dönük kontrol */
export const KN_LEGACY_STUB_IDS = ["kn-theme-compat-stub", "kn-shopify-stub"] as const;

function stripTrackingScripts(html: string): string {
  let out = html;
  out = out.replace(SHOPIFY_SCRIPT_SRC, "");
  out = out.replace(SHOPIFY_SCRIPT_IDS, "");
  out = out.replace(ANALYTICS_BLOCK, "");
  out = out.replace(SHOPIFY_ATTRIBUTION, "");
  out = out.replace(SHOPIFY_FEATURE_ASSETS, "");
  out = out.replace(PRODUCT_3D_MODEL, "");
  out = out.replace(SHOPIFY_LOAD_FEATURES_BOOT, "");
  out = out.replace(SHOPIFY_SIGN_IN, "");
  out = out.replace(SHOPIFY_ST, "");
  out = out.replace(SHOPIFY_MODULES, "");
  out = out.replace(MONORAIL_BEACON, "");
  out = out.replace(TREKKIE_SHIM, "");
  out = out.replace(CAPTCHA_BOOTSTRAP, "");
  out = out.replace(SHOPIFY_ANALYTICS_META, "");
  out = out.replace(SHOPIFY_PAYPAL, "");
  out = out.replace(DNS_PREFETCH_SHOPIFY, "");
  out = out.replace(SHOPIFY_ROUTES_BOOT, "");
  out = out.replace(SHOPIFY_PERF_MARK, "");
  out = out.replace(SHOPIFY_ACCEL_EL, "");
  out = out.replace(HTTRACK_MIRROR_COMMENT, "");
  out = out.replace(META_SHOPIFY, "");
  out = out.replace(STYLE_DATA_SHOPIFY, "<style>");
  return out;
}

/** HTML sınıf / id — shopify-section → kn-mirror-section (tema JS ile uyumlu) */
export function renameLegacySectionMarkers(html: string): string {
  let out = html;
  out = out.replace(/\bshopify-section-group\b/g, "kn-section-group");
  out = out.replace(/\bshopify-section\b/g, "kn-mirror-section");
  out = out.replace(/\bid="shopify-section-/g, 'id="kn-section-');
  out = out.replace(/#shopify-section-/g, "#kn-section-");
  out = out.replace(/\.shopify-section\b/g, ".kn-mirror-section");
  out = out.replace(/shopify-design-mode/g, "kn-design-mode");
  out = out.replace(/data-shopify/g, "data-kn-theme");
  out = out.replace(/shopify-buyer-consent/g, "kn-buyer-consent");
  out = out.replace(/shopify-subscription-policy-button/g, "kn-subscription-policy-button");
  out = out.replace(/"inventory_management"\s*:\s*"shopify"/gi, '"inventory_management":null');
  return out;
}

/** Harici mağaza alan adlarını yerel rotalara çevir */
export function rewriteLegacyStoreLinksInMirrorHtml(html: string): string {
  let out = html;

  out = out.replace(/https?:\/\/shopify\.com\/\d+\/account[^"'\s]*/gi, "/account");
  out = out.replace(
    /https?:\/\/[^"'\s]*myshopify\.com\/customer_authentication\/redirect[^"'\s]*/gi,
    "/account",
  );
  out = out.replace(
    /https?:\/\/(?:www\.)?[\w-]+\.myshopify\.com\/products\/([^"?\s#]+)/gi,
    "/products/$1",
  );
  out = out.replace(
    /https?:\/\/(?:www\.)?[\w-]+\.myshopify\.com\/collections\/([^"?\s#]+)/gi,
    "/collections/$1",
  );
  out = out.replace(
    /https?:\/\/(?:www\.)?[\w-]+\.myshopify\.com\/cdn\/shop\//gi,
    "/theme/techizmet-shop/cdn/shop/",
  );
  out = out.replace(
    /https?:\\\/\\\/(?:www\.)?[\w-]+\.myshopify\.com\\\/cdn\\\/shop\\\/([^"'\\]+)/gi,
    "/theme/techizmet-shop/cdn/shop/$1",
  );
  out = out.replace(/https?:\\\/\\\/(?:www\.)?[\w-]+\.myshopify\.com/gi, "");
  out = out.replace(/https?:\/\/(?:www\.)?[\w-]+\.myshopify\.com/gi, "");
  out = out.replace(/(?:www\.)?[\w-]+\.myshopify\.com/gi, "");
  out = out.replace(/https?:\/\/cdn\.shopify\.com/gi, "/theme/techizmet-shop/cdn");
  out = out.replace(/\/cdn\/shopifycloud\//gi, "/cdn/legacy/");
  out = out.replace(/shopifycloud\//gi, "legacy/");
  out = out.replace(/https?:\/\/[^"'\s]*\.shopifycdn\.com[^"'\s]*/gi, "");
  out = out.replace(/https?:\/\/[^"'\s]*shopifycloud[^"'\s]*/gi, "");
  out = out.replace(/\/theme\/techizmet-shop\/cdn\/shopifycloud\//gi, "/theme/techizmet-shop/cdn/legacy/");

  out = out.replace(
    /predictive_search_url:\s*['"]\/en-us\/search\/suggest['"]/gi,
    "predictive_search_url: '/api/store/search/suggest'",
  );
  out = out.replace(/cart_add_url:\s*['"]\/cart\/add['"]/gi, "cart_add_url: '/api/cart/items'");
  out = out.replace(/cart_change_url:\s*['"]\/cart\/change['"]/gi, "cart_change_url: '/api/cart/items'");
  out = out.replace(/cart_update_url:\s*['"]\/cart\/update['"]/gi, "cart_update_url: '/api/cart'");
  out = out.replace(/cart_url:\s*['"]\/cart['"]/gi, "cart_url: '/cart'");
  out = out.replace(/(?:\.\.\/)*(?:[a-z]{2}(?:-[a-z]{2})?\/)?search\.html/gi, "/search");

  return out;
}

function injectThemeCompatStub(html: string): string {
  let out = html.replace(/<script id="kn-shopify-stub">[\s\S]*?<\/script>\s*/i, "");
  if (!out.includes(`id="${KN_THEME_COMPAT_STUB_ID}"`)) {
    out = out.replace(/<head>/i, `<head>${THEME_COMPAT_STUB}`);
  }
  return out;
}

/** Tam sanitizasyon — derleme ve canlı mirror HTML */
export function sanitizeLegacyStoreMirrorHtml(html: string): string {
  let out = stripTrackingScripts(html);
  out = rewriteLegacyStoreLinksInMirrorHtml(out);
  out = renameLegacySectionMarkers(out);
  out = injectThemeCompatStub(out);
  return out;
}

/** @deprecated — sanitizeLegacyStoreMirrorHtml kullanın */
export function stripShopifyTrackingFromMirrorHtml(html: string): string {
  return sanitizeLegacyStoreMirrorHtml(html);
}

/** @deprecated — sanitizeLegacyStoreMirrorHtml kullanın */
export function rewriteShopifyLinksInMirrorHtml(html: string): string {
  return rewriteLegacyStoreLinksInMirrorHtml(html);
}

/** Şifre alanları — tarayıcı autocomplete uyarısı */
export function patchMirrorFormAutocomplete(html: string): string {
  return html.replace(/(<input\b[^>]*\btype=["']password["'][^>]*)(>)/gi, (full, pre, end) => {
    if (/\bautocomplete\s*=/.test(pre)) return full;
    const ac = /\bname=["'][^"']*password[^"']*confirm/i.test(pre)
      ? ' autocomplete="new-password"'
      : ' autocomplete="current-password"';
    return `${pre}${ac}${end}`;
  });
}
