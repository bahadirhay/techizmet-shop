import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

function stripQuotes(v) {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}
process.env.DATABASE_URL = stripQuotes(process.env.DATABASE_URL ?? "");
process.env.STORE_SITE_SLUG = stripQuotes(process.env.STORE_SITE_SLUG ?? "anatolianpaw");

const slug = process.argv[2] ?? "kurutulmus-dana-girtlak";
const template = "spectrum-sunscreen-spf-50-tr.html";

async function main() {
  const { prisma } = await import("../src/lib/prisma.ts");
  const site = await prisma.storeSite.findUnique({ where: { slug: process.env.STORE_SITE_SLUG } });
  if (!site) throw new Error("site not found");
  console.log("site", site.slug, site.id);

  const { buildMirrorHtml, injectProductCommerceIntoMirrorHtml } = await import(
    "../src/lib/mirror-html-build.ts"
  );
  const { getSiteSettings } = await import("../src/lib/site-settings.ts");

  const normalized = `theme/techizmet-shop/mirror/products/${template}`;
  console.log("building", normalized, "productSlug", slug);

  let html = await buildMirrorHtml({
    normalized,
    locale: "tr",
    siteId: site.id,
    siteName: site.name,
    tenantSlug: site.slug,
    productSlug: slug,
  });
  console.log("buildMirrorHtml ok", html.length);

  const settings = await getSiteSettings(site.id);
  html = await injectProductCommerceIntoMirrorHtml(html, site.id, normalized, "tr", settings, slug);
  console.log("inject commerce ok", html.length);
}

main().catch((e) => {
  console.error("FAIL", e?.stack || e);
  process.exit(1);
});
