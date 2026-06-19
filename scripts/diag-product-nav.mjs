const slug = "24hr-smudge-proof-mascara";
const home = await fetch(`https://shop.techizmet.com/products/${slug}`, { cache: "no-store" });
const html = await home.text();
const iframe = html.match(/iframe[^>]+src="([^"]+)"/i)?.[1];
console.log("product iframe:", iframe?.slice(0, 140));
const paw = /Ürünler|kurutulmus|kopek-odul/i.test(html);
console.log("paw in outer:", paw);

if (iframe) {
  const u = iframe.startsWith("http") ? iframe : `https://shop.techizmet.com${iframe}`;
  const inner = await (await fetch(u, { cache: "no-store" })).text();
  const nav = inner.match(/header--navigation-list[\s\S]*?<\/ul>/i)?.[0]?.slice(0, 500);
  console.log("inner nav:", nav);
  console.log("inner paw:", /Ürünler|kurutulmus|kopek/i.test(inner));
}
