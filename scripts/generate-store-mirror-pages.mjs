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

writeFileSync(join(ROOT, "account", "index-tr.html"), buildFromShell(ABOUT_TR, accountMainTr, "Hesabım"), "utf8");
writeFileSync(join(ROOT, "account", "index.html"), buildFromShell(ABOUT_EN, accountMainEn, "My account"), "utf8");
writeFileSync(join(ROOT, "account", "favorites-tr.html"), buildFromShell(ABOUT_TR, favMainTr, "Favorilerim"), "utf8");
writeFileSync(join(ROOT, "account", "favorites.html"), buildFromShell(ABOUT_EN, favMainEn, "Favorites"), "utf8");
writeFileSync(join(ROOT, "cart", "index-tr.html"), buildFromShell(ABOUT_TR, cartMainTr, "Sepetim"), "utf8");
writeFileSync(join(ROOT, "cart", "index.html"), buildFromShell(ABOUT_EN, cartMainEn, "Cart"), "utf8");
writeFileSync(join(ROOT, "checkout", "index-tr.html"), buildFromShell(ABOUT_TR, checkoutMainTr, "Ödeme"), "utf8");
writeFileSync(join(ROOT, "checkout", "index.html"), buildFromShell(ABOUT_EN, checkoutMainEn, "Checkout"), "utf8");
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

console.log("Generated account/, favorites, cart/, checkout/ (+ success) mirror pages");
