/**
 * about-tr.html kabuğundan hesap sayfası mirror HTML üretir
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "theme", "techizmet-shop", "mirror");
const ABOUT_TR = join(ROOT, "pages", "about-tr.html");
const ABOUT_EN = join(ROOT, "pages", "about.html");
const OUT_DIR = join(ROOT, "account");

const MAIN_TR = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
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

const MAIN_EN = `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
          <section class="shopify-section page-banner">
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container">
    <div class="section--header with--arrow text-center">
      <h1 class="section--heading heading-font h2">My account</h1>
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

function buildFromShell(shellPath, mainBlock, outName) {
  const html = readFileSync(shellPath, "utf8");
  const start = html.indexOf('<main id="MainContent"');
  const end = html.indexOf("</main>", start);
  if (start < 0 || end < 0) throw new Error(`MainContent not found in ${shellPath}`);
  let out = html.slice(0, start) + mainBlock + html.slice(end + "</main>".length);
  if (!out.includes("account.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/cdn/shop/t/5/assets/account1dbb.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  out = out.replace(/<title>[^<]*<\/title>/i, (m) =>
    outName.includes("-tr") ? "<title>Hesabım</title>" : "<title>My account</title>",
  );
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "index-tr.html"), buildFromShell(ABOUT_TR, MAIN_TR, "index-tr.html"), "utf8");
writeFileSync(join(OUT_DIR, "index.html"), buildFromShell(ABOUT_EN, MAIN_EN, "index.html"), "utf8");
console.log("Wrote", join(OUT_DIR, "index-tr.html"), "and index.html");
