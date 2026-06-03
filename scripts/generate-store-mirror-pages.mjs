/**
 * about kabuğundan hesap / favoriler / sepet mirror HTML üretir
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "theme", "techizmet-shop", "mirror");
const ABOUT_TR = join(ROOT, "pages", "about-tr.html");
const ABOUT_EN = join(ROOT, "pages", "about.html");

function buildFromShell(shellPath, mainBlock, title) {
  const html = readFileSync(shellPath, "utf8");
  const start = html.indexOf('<main id="MainContent"');
  const end = html.indexOf("</main>", start);
  if (start < 0 || end < 0) throw new Error(`MainContent not found in ${shellPath}`);
  let out = html.slice(0, start) + mainBlock + html.slice(end + "</main>".length);
  if (!out.includes("account.css") && mainBlock.includes("account-page")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/cdn/shop/t/5/assets/account1dbb.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  if (mainBlock.includes("cart-page") && !out.includes("cartcfbd.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/cdn/shop/t/5/assets/cartcfbd.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  return out;
}

function injectCheckoutMirrorAssets(html) {
  let out = html;
  const css = `<style id="kn-checkout-mirror-css">
.kn-checkout-embed-wrap { width: 100%; max-width: 100%; }
.kn-checkout-embed { display: block; width: 100%; min-height: min(720px, 85vh); border: 0; background: transparent; overflow: hidden; }
</style>`;
  const bridge = `<script id="kn-checkout-embed-bridge">(function(){var iframe=document.getElementById("kn-checkout-embed");if(!iframe)return;function fit(){var top=iframe.getBoundingClientRect().top;var h=Math.max(520,window.innerHeight-top-12);iframe.style.height=Math.ceil(h)+"px";}fit();window.addEventListener("resize",fit);iframe.addEventListener("load",fit);})();</script>`;
  if (!out.includes('id="kn-checkout-mirror-css"')) out = out.replace(/<\/head>/i, `${css}\n<link href="/theme/techizmet-shop/kn-checkout-embed.css?v=4" rel="stylesheet" type="text/css" media="all" />\n</head>`);
  if (!out.includes('id="kn-checkout-embed-bridge"')) out = out.replace(/<\/body>/i, `${bridge}</body>`);
  return out;
}

function injectOrderTrackMirrorAssets(html) {
  let out = html;
  const css = `<style id="kn-order-track-mirror-css">
.kn-order-track-embed-wrap { width: 100%; max-width: 100%; }
.kn-order-track-embed { display: block; width: 100%; min-height: min(520px, 75vh); border: 0; background: transparent; overflow: hidden; }
</style>`;
  const bridge = `<script id="kn-order-track-embed-bridge">(function(){var iframe=document.getElementById("kn-order-track-embed");if(!iframe)return;function fit(){var top=iframe.getBoundingClientRect().top;var h=Math.max(420,window.innerHeight-top-12);iframe.style.height=Math.ceil(h)+"px";}fit();window.addEventListener("resize",fit);iframe.addEventListener("load",fit);})();</script>`;
  if (!out.includes('id="kn-order-track-mirror-css"')) out = out.replace(/<\/head>/i, `${css}\n<link href="/theme/techizmet-shop/kn-order-track-embed.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>`);
  if (!out.includes('id="kn-order-track-embed-bridge"')) out = out.replace(/<\/body>/i, `${bridge}</body>`);
  return out;
}

const accountMainTr = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
<section class="shopify-section page-banner">
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container">
    <div class="section--header with--arrow text-center">
      <h1 class="section--heading heading-font h2">Hesabım</h1>
      <p class="text-medium" id="kn-account-welcome"></p>
    </div>
  </div>
</div>
</section>
<section class="shopify-section account-page">
  <div class="section-wrapper section-spacing scheme-primary">
    <div class="container container-narrow">
      <div class="main-account--content" id="kn-account-dashboard-root"></div>
    </div>
  </div>
</section>
</main>`;

const accountMainEn = accountMainTr
  .replace("Hesabım", "My account")
  .replace('id="kn-account-welcome"', 'id="kn-account-welcome"');

const favMainTr = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
<section class="shopify-section page-banner">
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container">
    <div class="section--header with--arrow text-center">
      <h1 class="section--heading heading-font h2">Favorilerim</h1>
    </div>
  </div>
</div>
</section>
<section class="shopify-section account-page">
  <div class="section-wrapper section-spacing scheme-primary">
    <div class="container container-narrow">
      <div class="main-account--content" id="kn-page-root"></div>
    </div>
  </div>
</section>
</main>`;

const favMainEn = favMainTr.replace("Favorilerim", "Favorites");

const cartMainTr = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
<section class="shopify-section section-main-cart cart-page">
  <div class="section-wrapper section-spacing scheme-primary section-solid">
    <div class="container-narrow">
      <div class="main-cart--outer" data-kn-cart-outer>
        <div class="main-cart--wrapper" data-kn-cart-wrapper>
          <div class="main-cart--content">
            <div id="kn-page-root"></div>
          </div>
          <div class="main-cart--featured-images" id="kn-cart-featured" hidden></div>
        </div>
      </div>
    </div>
  </div>
</section>
</main>`;

const cartMainEn = cartMainTr;

const checkoutMainTr = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
<section class="shopify-section section-checkout checkout-page">
  <div class="section-wrapper section-spacing scheme-primary section-solid">
    <div class="container-narrow">
      <div class="kn-checkout-embed-wrap">
        <iframe
          id="kn-checkout-embed"
          class="kn-checkout-embed"
          src="/checkout/embed"
          title="Ödeme"
          loading="eager"
        ></iframe>
      </div>
    </div>
  </div>
</section>
</main>`;

const checkoutMainEn = checkoutMainTr.replace('title="Ödeme"', 'title="Checkout"');

const orderTrackMainTr = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
<section class="shopify-section section-order-track order-track-page">
  <div class="section-wrapper section-spacing scheme-primary section-solid">
    <div class="container-narrow">
      <div class="kn-order-track-embed-wrap">
        <iframe
          id="kn-order-track-embed"
          class="kn-order-track-embed"
          src="/orders/track/embed"
          title="Sipariş takip"
          loading="eager"
        ></iframe>
      </div>
    </div>
  </div>
</section>
</main>`;

const orderTrackMainEn = orderTrackMainTr.replace('title="Sipariş takip"', 'title="Track order"');

const checkoutSuccessMainTr = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
<section class="shopify-section checkout-success-page">
  <div class="section-wrapper section-spacing scheme-primary section-solid">
    <div class="container-narrow">
      <div id="kn-page-root"></div>
    </div>
  </div>
</section>
</main>`;

const checkoutSuccessMainEn = checkoutSuccessMainTr;

mkdirSync(join(ROOT, "account"), { recursive: true });
mkdirSync(join(ROOT, "cart"), { recursive: true });
mkdirSync(join(ROOT, "checkout"), { recursive: true });
mkdirSync(join(ROOT, "orders"), { recursive: true });

writeFileSync(join(ROOT, "account", "index-tr.html"), buildFromShell(ABOUT_TR, accountMainTr, "Hesabım"), "utf8");
writeFileSync(join(ROOT, "account", "index.html"), buildFromShell(ABOUT_EN, accountMainEn, "My account"), "utf8");
writeFileSync(join(ROOT, "account", "favorites-tr.html"), buildFromShell(ABOUT_TR, favMainTr, "Favorilerim"), "utf8");
writeFileSync(join(ROOT, "account", "favorites.html"), buildFromShell(ABOUT_EN, favMainEn, "Favorites"), "utf8");
writeFileSync(join(ROOT, "cart", "index-tr.html"), buildFromShell(ABOUT_TR, cartMainTr, "Sepetim"), "utf8");
writeFileSync(join(ROOT, "cart", "index.html"), buildFromShell(ABOUT_EN, cartMainEn, "Cart"), "utf8");
writeFileSync(
  join(ROOT, "checkout", "index-tr.html"),
  injectCheckoutMirrorAssets(buildFromShell(ABOUT_TR, checkoutMainTr, "Ödeme")),
  "utf8",
);
writeFileSync(
  join(ROOT, "checkout", "index.html"),
  injectCheckoutMirrorAssets(buildFromShell(ABOUT_EN, checkoutMainEn, "Checkout")),
  "utf8",
);
writeFileSync(
  join(ROOT, "orders", "track-tr.html"),
  injectOrderTrackMirrorAssets(buildFromShell(ABOUT_TR, orderTrackMainTr, "Sipariş takip")),
  "utf8",
);
writeFileSync(
  join(ROOT, "orders", "track.html"),
  injectOrderTrackMirrorAssets(buildFromShell(ABOUT_EN, orderTrackMainEn, "Track order")),
  "utf8",
);
writeFileSync(
  join(ROOT, "checkout", "success-tr.html"),
  buildFromShell(ABOUT_TR, checkoutSuccessMainTr, "Siparişiniz alındı"),
  "utf8",
);
writeFileSync(
  join(ROOT, "checkout", "success.html"),
  buildFromShell(ABOUT_EN, checkoutSuccessMainEn, "Order received"),
  "utf8",
);
writeFileSync(
  join(ROOT, "account", "login-tr.html"),
  buildFromShell(ABOUT_TR, checkoutSuccessMainTr, "Giriş yap"),
  "utf8",
);
writeFileSync(
  join(ROOT, "account", "login.html"),
  buildFromShell(ABOUT_EN, checkoutSuccessMainEn, "Log in"),
  "utf8",
);
writeFileSync(
  join(ROOT, "account", "register-tr.html"),
  buildFromShell(ABOUT_TR, checkoutSuccessMainTr, "Hesap oluştur"),
  "utf8",
);
writeFileSync(
  join(ROOT, "account", "register.html"),
  buildFromShell(ABOUT_EN, checkoutSuccessMainEn, "Create account"),
  "utf8",
);
writeFileSync(
  join(ROOT, "account", "forgot-password-tr.html"),
  buildFromShell(ABOUT_TR, checkoutSuccessMainTr, "Şifremi unuttum"),
  "utf8",
);
writeFileSync(
  join(ROOT, "account", "forgot-password.html"),
  buildFromShell(ABOUT_EN, checkoutSuccessMainEn, "Forgot password"),
  "utf8",
);

console.log(
  "Generated account/, favorites, cart/, checkout/, orders/ (+ success, login, register, forgot-password) mirror pages",
);
