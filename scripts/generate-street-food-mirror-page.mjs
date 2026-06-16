/**
 * about-tr.html kabuğundan Sokak Dostları Mama Fonu vitrin sayfası üretir
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "theme", "techizmet-shop", "mirror");
const ABOUT_TR = join(ROOT, "pages", "about-tr.html");
const ABOUT_EN = join(ROOT, "pages", "about.html");

function buildFromShell(shellPath, mainBlock, meta) {
  const html = readFileSync(shellPath, "utf8");
  const start = html.indexOf('<main id="MainContent"');
  const end = html.indexOf("</main>", start);
  if (start < 0 || end < 0) throw new Error(`MainContent not found in ${shellPath}`);
  let out = html.slice(0, start) + mainBlock + html.slice(end + "</main>".length);
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
  out = out.replace(
    /<meta property="og:title" content="[^"]*">/i,
    `<meta property="og:title" content="${meta.title}">`,
  );
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*">/i,
    `<meta name="twitter:title" content="${meta.title}">`,
  );
  if (meta.description) {
    out = out.replace(
      /<meta name="description" content="[^"]*">/i,
      `<meta name="description" content="${meta.description}">`,
    );
    out = out.replace(
      /<meta property="og:description" content="[^"]*">/i,
      `<meta property="og:description" content="${meta.description}">`,
    );
    out = out.replace(
      /<meta name="twitter:description" content="[^"]*">/i,
      `<meta name="twitter:description" content="${meta.description}">`,
    );
  }
  return out;
}

function pageBanner(sectionKey, title, subtitle) {
  return `<section id="kn-mirror-section-template--${sectionKey}__page_banner" class="kn-mirror-section page-banner">
<div class="section-wrapper section-spacing scheme-scheme-d845756f-c4c9-40c8-b95e-18182d3a518f section-gradient" data-vvip="25">
        <div class="page--content">
          <div class="container-narrow">
            <div class="page--content-inner text-center">
        <h2 class="page--title heading-font page--item h2">${title}</h2>
        <p class="page--desc page--item text-medium">${subtitle}</p>
            </div>
          </div>
        </div>
</div>
<style>
  #kn-mirror-section-template--${sectionKey}__page_banner .section-spacing {
    --top_spacing: 25px;
    --bottom_spacing: 25px;
    --banner_height: 250px;
    --image_overlay_opacity: 0.1;
  }
  @media only screen and (max-width:767px) {
    #kn-mirror-section-template--${sectionKey}__page_banner .section-spacing {
      --top_spacing: 0px;
      --bottom_spacing: 0px;
      --banner_height: 200px;
    }
  }
</style>
</section>`;
}

function richText(sectionKey, bodyHtml) {
  return `<section id="kn-mirror-section-template--${sectionKey}__richtext" class="kn-mirror-section section-richtext">
<link href="/theme/techizmet-shop/cdn/shop/t/5/assets/richtext5169.css?v=67875551086195285421750848849" rel="stylesheet" type="text/css" media="all" />
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container-narrow">
    <div class="richtext--content content-medium position-left text-left">
${bodyHtml}
    </div>
  </div>
</div>
<style>
  #kn-mirror-section-template--${sectionKey}__richtext {
    --top_spacing: 25px;
    --bottom_spacing: 40px;
  }
  @media only screen and (max-width: 767px) {
    #kn-mirror-section-template--${sectionKey}__richtext {
      --top_spacing: 20px;
      --bottom_spacing: 30px;
    }
  }
</style>
</section>`;
}

function donationsSection(sectionKey) {
  return `<section id="kn-mirror-section-template--${sectionKey}__donations" class="kn-mirror-section section-richtext">
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container-narrow">
    <div id="kn-street-food-donations" class="kn-street-food-donations"></div>
  </div>
</div>
</section>`;
}

function statsSection(sectionKey) {
  return `<section id="kn-mirror-section-template--${sectionKey}__stats" class="kn-mirror-section section-richtext">
<div class="section-wrapper section-spacing scheme-primary section-solid">
  <div class="container-narrow">
    <div id="kn-street-food-stats" class="kn-street-food-stats" aria-live="polite"></div>
  </div>
</div>
</section>`;
}

function buildMain(sectionKey, title, subtitle, howHtml) {
  return `<main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1" data-kn-street-food-fund-page="1">
${pageBanner(sectionKey, title, subtitle)}
${statsSection(sectionKey)}
${richText(sectionKey, howHtml)}
${donationsSection(sectionKey)}
</main>`;
}

const SECTION_KEY = "street_food_fund";

const TR_HOW = `<h3 class="h4">Nasıl çalışır?</h3>
<ol>
  <li>Ödül mamalarımızdan sipariş verirsiniz.</li>
  <li>Siparişinizdeki ürün gramajı kadar kuru mama fonumuzda birikir.</li>
  <li>Hedefe ulaşınca mama, ihtiyaç sahibi barınak veya sokak dostlarına ulaştırılır.</li>
  <li>Bağış fotoğraf ve videoları bu sayfada paylaşılır.</li>
</ol>
<p><a href="/collections/all" class="button button-primary">Alışverişe başla</a></p>`;

const EN_HOW = `<h3 class="h4">How it works</h3>
<ol>
  <li>Order from our reward treats.</li>
  <li>Each order adds dry food to the fund based on product weight.</li>
  <li>When the goal is reached, food is delivered to shelters or street friends in need.</li>
  <li>Donation photos and videos are shared on this page.</li>
</ol>
<p><a href="/collections/all" class="button button-primary">Start shopping</a></p>`;

const pages = [
  {
    file: join(ROOT, "pages", "sokak-dostlari-tr.html"),
    shell: ABOUT_TR,
    title: "Sokak Dostları Mama Fonu",
    subtitle: "Ödül Dostunu Mutlu Eder, Siparişin Bir Sokak Dostunu Doyurur.",
    description: "Sokak dostları mama fonu — siparişinizle sokak hayvanlarına mama bağışı.",
    how: TR_HOW,
  },
  {
    file: join(ROOT, "pages", "sokak-dostlari.html"),
    shell: ABOUT_EN,
    title: "Street Friends Food Fund",
    subtitle: "Treat your pet, feed a street friend.",
    description: "Street friends food fund — your orders help feed animals in need.",
    how: EN_HOW,
  },
];

for (const p of pages) {
  const main = buildMain(SECTION_KEY, p.title, p.subtitle, p.how);
  const html = buildFromShell(p.shell, main, { title: p.title, description: p.description });
  writeFileSync(p.file, html, "utf8");
  console.log(`[street-food-mirror] ${p.file} (${(html.length / 1024).toFixed(0)} KB)`);
}
