const html = await (await fetch("https://techizmet-shop.vercel.app/api/vitrin/mirror?path=theme/techizmet-shop/mirror/index-tr.html&pageKey=home")).text();

// Broken: whitespace + rel="preload" without <link immediately before (allow newline)
const broken = [...html.matchAll(/\n\s+rel="preload"/g)];
const valid = [...html.matchAll(/<link[^>]+rel="preload"/g)];
console.log("broken count:", broken.length);
console.log("valid link preload count:", valid.length);

for (const m of broken.slice(0, 3)) {
  console.log("--- broken at", m.index, "---");
  console.log(html.slice(m.index - 80, m.index + 120));
}

// Check img patch issue - unclosed img before preload
const headerLogo = html.indexOf('class="header--logo"');
console.log("\n--- header logo block ---");
console.log(html.slice(headerLogo, headerLogo + 900));
