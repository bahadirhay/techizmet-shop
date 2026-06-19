const home = await fetch("https://shop.techizmet.com/?_=" + Date.now(), {
  cache: "no-store",
  headers: { "Cache-Control": "no-cache" },
});
const html = await home.text();
const iframes = [...html.matchAll(/iframe[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
console.log("iframe srcs:", iframes);

const prebuilt = await fetch(
  "https://shop.techizmet.com/_mirror-prebuilt/theme/techizmet-shop/mirror/index-tr.html",
  { cache: "no-store" },
);
const body = await prebuilt.text();
console.log("\nprebuilt iframe content:");
console.log("paw:", /kurutulmus|kopek-odul/i.test(body));
console.log("cosmetic:", /mascara|king noor/i.test(body));
console.log(
  "products:",
  [...new Set(body.match(/products\/[a-z0-9-]+/gi) || [])].slice(0, 4),
);
