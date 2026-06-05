import "server-only";

import { getDefaultSite } from "@/lib/site";
import { buildBreadcrumbListJsonLd, buildCollectionPageJsonLd as buildCollectionSchema } from "@/lib/seo/json-ld";
import { loadCollectionSeo } from "@/lib/seo/collection-seo";

export async function buildCollectionPageJsonLd(slug: string, categorySlug?: string | null) {
  const ctx = await loadCollectionSeo(slug, categorySlug);
  if (!ctx) return null;

  const site = await getDefaultSite();
  const breadcrumbs = [
    { name: "Ana sayfa", path: "/" },
    { name: "Koleksiyonlar", path: "/collections" },
    { name: ctx.breadcrumbLabel, path: ctx.canonicalPath },
  ];

  return [
    buildCollectionSchema({
      name: ctx.collectionName,
      description: ctx.collectionDescription,
      collectionPath: ctx.canonicalPath,
      siteName: site.name,
    }),
    buildBreadcrumbListJsonLd(breadcrumbs),
  ];
}
