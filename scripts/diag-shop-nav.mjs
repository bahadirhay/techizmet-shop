const paths = [
  ["prebuilt-home", "/_mirror-prebuilt/theme/techizmet-shop/mirror/index-tr.html"],
  ["mirror-api-home", "/api/vitrin/mirror?path=theme/techizmet-shop/mirror/index-tr.html&pageKey=home"],
  ["prebuilt-collections", "/_mirror-prebuilt/theme/techizmet-shop/mirror/collections/index-tr.html"],
  ["mirror-api-collections", "/api/vitrin/mirror?path=theme/techizmet-shop/mirror/collections/index-tr.html&pageKey=collections"],
  ["prebuilt-about", "/_mirror-prebuilt/theme/techizmet-shop/mirror/pages/about-tr.html"],
  ["mirror-api-about", "/api/vitrin/mirror?path=theme/techizmet-shop/mirror/pages/about-tr.html&pageKey=about"],
];

const NAV_RE = /<ul[^>]*header--navigation-list[^>]*>([\s\S]*?)<\/ul>/i;

function extractNav(html) {
  const m = html.match(NAV_RE);
  if (!m) return { found: false, items: [] };
  const items = [...m[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)/gi)].map((x) => ({
    href: x[1],
    text: x[2].trim(),
  }));
  return { found: true, injected: /data-kn-nav-injected/i.test(m[0]), items: items.slice(0, 15) };
}

for (const [name, path] of paths) {
  const r = await fetch("https://shop.techizmet.com" + path, { cache: "no-store" });
  const html = await r.text();
  const nav = extractNav(html);
  const paw = /kopek|kurutulmus|dana-girtlak|mamasi|paw/i.test(html);
  console.log(`\n=== ${name} (${r.status}) ===`);
  console.log("kn-nav-server:", /data-kn-nav-server/i.test(html));
  console.log("paw markers:", paw);
  console.log("nav found:", nav.found, "injected:", nav.injected);
  console.log("nav items:", nav.items);
}
