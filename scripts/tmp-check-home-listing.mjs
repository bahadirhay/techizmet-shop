import { config } from "dotenv";

config({ path: ".env.vercel.production" });

const { loadHomeListingProducts } = await import("../src/lib/mirror-home-products-inject-server.ts");
const { getDefaultSite } = await import("../src/lib/site.ts");

const site = await getDefaultSite();
const products = await loadHomeListingProducts(site.id);
const multi = products.filter((p) => p.imageUrls && p.imageUrls.length > 1);
console.log("total", products.length, "multi", multi.length);
for (const p of multi.slice(0, 3)) {
  console.log(p.slug, p.imageUrls?.length);
}
