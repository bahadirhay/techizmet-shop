const url =
  "https://shop.techizmet.com/api/vitrin/mirror?path=theme/techizmet-shop/mirror/index-tr.html&pageKey=home";
const html = await (await fetch(url, { cache: "no-store" })).text();

const megaHost = html.match(/id="kn-mega-host"[\s\S]*?<\/div>\s*<\/div>/i)?.[0]?.slice(0, 2000);
console.log("kn-mega-host snippet:", megaHost?.slice(0, 800) ?? "NOT FOUND");

const pawInMega = /kurutulmus|kopek|dana-girtlak|mamasi/i.test(html);
const demoInMega = /mascara|foundation|king noor|hydrasoft/i.test(html);
console.log("paw in full html:", pawInMega);
console.log("demo in full html:", demoInMega);

const allNavTexts = [...html.matchAll(/header--menu-link[^>]*>([^<]+)/gi)].map((m) => m[1].trim());
console.log("header menu labels:", [...new Set(allNavTexts)]);

const mobile = html.match(/mobile-menu--list[\s\S]*?<\/ul>/i)?.[0];
if (mobile) {
  const items = [...mobile.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)/gi)].map((m) => ({
    href: m[1],
    text: m[2].trim(),
  }));
  console.log("mobile nav:", items.slice(0, 12));
}

// compare raw theme file would need local - check if mega dropdown has paw slugs
const megaLinks = [...html.matchAll(/kn-nav-mega[^>]*>[\s\S]*?<\/a>/gi)].length;
const productLinksInNav = [...html.matchAll(/kn-nav-mega__product[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
console.log("mega product links:", [...new Set(productLinksInNav)].slice(0, 10));
