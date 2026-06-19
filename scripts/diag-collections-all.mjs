const url =
  "https://shop.techizmet.com/api/vitrin/mirror?path=theme/techizmet-shop/mirror/collections/all-tr.html&pageKey=collections-all&_=" +
  Date.now();
const html = await (await fetch(url, { cache: "no-store" })).text();

const megaCount = (html.match(/kn-nav-dropdown--fruitser/gi) || []).length;
const ciltCount = (html.match(/CİLT BAKIMI|Cilt Bakımı/gi) || []).length;
const serumCount = (html.match(/>Serumlar</gi) || []).length;
const megaHosts = (html.match(/id="kn-mega-host"/gi) || []).length;

console.log("mega dropdowns:", megaCount);
console.log("CİLT BAKIMI occurrences:", ciltCount);
console.log("Serumlar occurrences:", serumCount);
console.log("kn-mega-host:", megaHosts);

// Find visible mega panels outside header
const idx = html.indexOf("kn-nav-mega__heading");
if (idx > -1) {
  console.log("\nfirst mega block context:", html.slice(Math.max(0, idx - 200), idx + 400));
}

// Check CSS link for nav dropdown
console.log("\nhas kn-nav-dropdown.css:", html.includes("kn-nav-dropdown.css"));
