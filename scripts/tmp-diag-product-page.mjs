import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

process.env.STORE_SITE_SLUG = process.env.STORE_SITE_SLUG ?? "anatolianpaw";

const slug = process.argv[2] ?? "kurutulmus-dana-girtlak";

async function main() {
  const { getDefaultSite } = await import("../src/lib/site.ts");
  const { loadMirrorProductFramePayload } = await import("../src/lib/mirror-product-frame-server.ts");
  const { buildProductMirrorSrc } = await import("../src/lib/mirror-html-path-server.ts");
  const { loadPublishedProductSeo } = await import("../src/lib/seo/product-seo.ts");
  const { buildProductPageJsonLd } = await import("../src/lib/seo/product-page-json-ld.ts");
  const { resolveMirrorProductTemplateSlug } = await import("../src/lib/mirror-html-path.ts");

  const site = await getDefaultSite();
  console.log("site", site.slug);

  const seo = await loadPublishedProductSeo(slug);
  console.log("seo", seo ? seo.visibleTitle : null);

  const jsonLd = await buildProductPageJsonLd(slug);
  console.log("jsonLd", jsonLd ? "ok" : null);

  const template = resolveMirrorProductTemplateSlug(slug);
  console.log("template", template);

  const payload = await loadMirrorProductFramePayload(site.id, slug, "tr");
  console.log("payload", payload ? "ok" : null);

  if (template) {
    const src = await buildProductMirrorSrc(slug, "tr", template);
    console.log("src", src.slice(0, 120));
  }
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
