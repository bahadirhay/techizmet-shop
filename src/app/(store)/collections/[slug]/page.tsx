import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MirrorCollectionFrame } from "@/components/store/MirrorCollectionFrame";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { ProductGridBlock } from "@/components/store/ProductGridBlock";
import { getStoreLocale } from "@/lib/i18n/server";
import {
  parseCollectionFilterParams,
} from "@/lib/collection-filter-facets";
import { prisma } from "@/lib/prisma";
import { loadCollectionSeo } from "@/lib/seo/collection-seo";
import { buildCollectionPageJsonLd } from "@/lib/seo/collection-page-json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; page?: string; brand?: string; volume?: string; tone?: string; quantity?: string; stock?: string; price_min?: string; price_max?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await searchParams;
  const base = await buildSiteMetadata();
  const seo = await loadCollectionSeo(slug, category);
  if (!seo) return base;

  return buildPageMetadata(base, {
    title: seo.metaTitle,
    description: seo.metaDescription,
    imageUrl: seo.imageUrl,
    canonicalPath: seo.canonicalPath,
  });
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; page?: string; brand?: string; volume?: string; tone?: string; quantity?: string; stock?: string; price_min?: string; price_max?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { category: categorySlug, page: pageParam } = sp;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const activeFilters = parseCollectionFilterParams(sp);
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const locale = await getStoreLocale();
  const jsonLd = await buildCollectionPageJsonLd(slug, categorySlug);

  const jsonLdNode = jsonLd ? <JsonLdScript data={jsonLd} /> : null;

  if (categorySlug?.trim()) {
    const cat = await prisma.storeCategory.findFirst({
      where: { siteId: site.id, slug: categorySlug.trim(), active: true },
    });
    if (!cat) notFound();
    const title = cat.title;

    if (homepageMode === "mirror") {
      return (
        <>
          {jsonLdNode}
          <MirrorCollectionFrame
            slug="all"
            categorySlug={categorySlug.trim()}
            locale={locale}
            title={title}
            page={page}
            activeFilters={activeFilters}
          />
        </>
      );
    }

    return (
      <>
        {jsonLdNode}
        <div className="kn-section kn-category-products">
          <h1 className="kn-section__title">{title}</h1>
          <ProductGridBlock limit={48} categorySlug={categorySlug.trim()} />
          <p className="mt-8 text-center">
            <Link href="/collections/all">← Tüm ürünler</Link>
          </p>
        </div>
      </>
    );
  }

  if (homepageMode === "mirror" && slug === "all") {
    return (
      <>
        {jsonLdNode}
        <MirrorCollectionFrame slug="all" locale={locale} page={page} activeFilters={activeFilters} />
      </>
    );
  }

  const collection = await prisma.storeCollection.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });

  if (homepageMode === "mirror") {
    if (collection) {
      return (
        <>
          {jsonLdNode}
          <MirrorCollectionFrame slug={slug} locale={locale} page={page} activeFilters={activeFilters} />
        </>
      );
    }
  }
  if (!collection && slug !== "all") notFound();

  return (
    <>
      {jsonLdNode}
      <div className="kn-section">
        <h1 className="kn-section__title">{collection?.title ?? "Tüm ürünler"}</h1>
        <ProductGridBlock limit={24} collectionSlug={slug === "all" ? undefined : slug} />
        <p className="mt-8 text-center">
          <Link href="/">← Ana sayfa</Link>
        </p>
      </div>
    </>
  );
}
