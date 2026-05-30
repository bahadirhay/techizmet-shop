const css = "https://techizmet-shop.vercel.app/theme/techizmet-shop/cdn/shop/t/5/assets/base2ff2.css?v=92980718826213120981750848849";
const res = await fetch(css);
console.log("base.css", res.status, res.headers.get("content-type"), "len", (await res.text()).length);

const theme = "https://techizmet-shop.vercel.app/theme/techizmet-shop/cdn/shop/t/5/assets/theme9bdd.css?v=92980718826213120981750848849";
const res2 = await fetch(theme);
console.log("theme.css", res2.status, res2.headers.get("content-type"));

// Check if link preload in body area exists in mirror and context
const mirror = await fetch("https://techizmet-shop.vercel.app/api/vitrin/mirror?path=theme/techizmet-shop/mirror/index-tr.html&pageKey=home");
const html = await mirror.text();
const bodyStart = html.indexOf("<body");
const headerIdx = html.indexOf('rel="preload" as="image"');
console.log("bodyStart", bodyStart, "first image preload at", headerIdx);
console.log("context:", html.slice(headerIdx - 100, headerIdx + 200));

// Check for broken script before header preload
const scriptIssues = html.match(/<script[^>]*>(?![\s\S]*?<\/script>)/gi);
console.log("unclosed script tags (rough):", scriptIssues?.length ?? 0);

// Find section with announcement and check structure
const annIdx = html.indexOf("announcement-bar--text");
console.log("announcement context:", html.slice(annIdx - 500, annIdx + 100));
