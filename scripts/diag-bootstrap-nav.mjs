const r = await fetch("https://shop.techizmet.com/api/store/bootstrap", {
  cache: "no-store",
  headers: { Host: "shop.techizmet.com" },
});
const j = await r.json();
console.log("bootstrap nav:", JSON.stringify(j.nav, null, 2));
