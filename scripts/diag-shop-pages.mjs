const BASE = "https://shop.techizmet.com";
const PAW_MARKERS = [
  /kurutulmus/i,
  /dana-girtlak/i,
  /kopek-odul/i,
  /anatolian\s*paw/i,
  /dogal-kopek/i,
  /kopekler/i,
  /mamasi/i,
];
const DEMO_MARKERS = [/king\s*noor/i, /mascara/i, /hydrasoft/i, /kozmetik/i, /skincare/i];

const pages = [
  ["/", "home"],
  ["/collections", "collections"],
  ["/collections/all", "collections-all"],
  ["/blogs/news", "blog-news"],
  ["/pages/about", "about"],
  ["/pages/contact", "contact"],
  ["/cart", "cart"],
  ["/api/vitrin/mirror?path=theme/techizmet-shop/mirror/index-tr.html&pageKey=home", "mirror-home-api"],
  ["/api/vitrin/store-catalog", "catalog-api"],
];

function scanNav(html) {
  const navLinks = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]{1,80})/gi)]
    .map((m) => ({ href: m[1], text: m[2].trim() }))
    .filter((l) => l.text && !l.href.startsWith("#") && !l.href.includes("javascript"));
  const menuLike = navLinks.filter(
    (l) =>
      l.href.includes("/collections") ||
      l.href.includes("/products") ||
      l.href.includes("/blogs") ||
      l.href.includes("/pages") ||
      l.text.match(/köpek|kopek|mama|paw|ürün|product|collection|blog|hakkımızda|about|contact/i),
  );
  return menuLike.slice(0, 20);
}

function flags(html) {
  const paw = PAW_MARKERS.some((r) => r.test(html));
  const demo = DEMO_MARKERS.some((r) => r.test(html));
  return { paw, demo };
}

for (const [path, name] of pages) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "diag-pages", "Cache-Control": "no-cache" },
    });
    const t = await r.text();
    const f = flags(t);
    console.log(`\n=== ${name} (${r.status}) ===`);
    console.log("paw:", f.paw, "| demo:", f.demo);
    if (name === "catalog-api") {
      const j = JSON.parse(t);
      console.log("products:", j.products?.slice(0, 3).map((p) => p.slug));
      continue;
    }
    const nav = scanNav(t);
    if (nav.length) console.log("nav links:", nav.slice(0, 12));
    const iframe = t.match(/iframe[^>]+src="([^"]+)"/i)?.[1];
    if (iframe) console.log("iframe:", iframe.slice(0, 100));
  } catch (e) {
    console.log(`\n=== ${name} ERROR ===`, e.message);
  }
}
