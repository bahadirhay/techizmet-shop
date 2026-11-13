import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MirrorCollectionFrame } from "@/components/store/MirrorCollectionFrame";
import { ThemeShellSectionsView } from "@/components/store/ThemeShellSectionsView";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { ProductGridBlock } from "@/components/store/ProductGridBlock";
import { LandingPageContent } from "@/components/store/LandingPageContent";
import { getStoreLocale } from "@/lib/i18n/server";
import {
  parseCollectionFilterParams,
} from "@/lib/collection-filter-facets";
import { prisma } from "@/lib/prisma";
import { loadCollectionSeo } from "@/lib/seo/collection-seo";
import { loadLandingPageData } from "@/lib/seo/landing-page-data";
import {
  findLandingIntentBySlug,
  LANDING_COLLECTION_SLUGS,
} from "@/lib/seo/search-intent";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
import { buildCollectionPageJsonLd } from "@/lib/seo/collection-page-json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { resolveThemeShellCollectionContent } from "@/lib/theme-shell-collection-content";
import {
  isThemeShellEnabledForCollectionSlug,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export const dynamic = "force-dynamic";

async function renderThemeShellCollection(
  siteId: string,
  databaseUrl: string,
  locale: Awaited<ReturnType<typeof getStoreLocale>>,
  slug: string,
  page: number,
  categorySlug: string | undefined,
  activeFilters: ReturnType<typeof parseCollectionFilterParams>,
  jsonLdNode: ReactNode,
) {
  const content = await resolveThemeShellCollectionContent(
    siteId,
    databaseUrl,
    locale,
    slug,
    page,
    categorySlug,
    activeFilters,
  );
  if (!content) notFound();
  return (
    <>
      {jsonLdNode}
      <ThemeShellSectionsView content={content} withCartBridge />
    </>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<
    ThemeShellPilotQuery & {
      category?: string;
      page?: string;
      brand?: string;
      volume?: string;
      tone?: string;
      quantity?: string;
      stock?: string;
      price_min?: string;
      price_max?: string;
    }
  >;
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
  searchParams: Promise<
    ThemeShellPilotQuery & {
      category?: string;
      page?: string;
      brand?: string;
      volume?: string;
      tone?: string;
      quantity?: string;
      stock?: string;
      price_min?: string;
      price_max?: string;
    }
  >;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { category: categorySlug, page: pageParam, themeShell, mirror, ...filterSp } = sp;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const activeFilters = parseCollectionFilterParams(filterSp);
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const locale = await getStoreLocale();
  const jsonLd = await buildCollectionPageJsonLd(slug, categorySlug);

  const jsonLdNode = jsonLd ? <JsonLdScript data={jsonLd} /> : null;

  // Head terimler için adanmış, içerik-öncelikli (tamamen taranabilir) landing sayfaları.
  // LANDING_COLLECTION_SLUGS DB'de koleksiyon olmasa da asla soft-404 olmamalı.
  const cleanSlug = slug.trim().toLowerCase();
  const landingIntent = findLandingIntentBySlug(cleanSlug);
  const isDedicatedLanding =
    Boolean(landingIntent) || LANDING_COLLECTION_SLUGS.includes(cleanSlug);
  if (isDedicatedLanding) {
    // Bütün veri burada beklenir ve bileşenler eşzamanlıdır: ürün ızgarası akışla
    // sonradan gelen gizli bir bloğa düşmez, gövdede tek parça basılır.
    const [landing, memberPricing] = await Promise.all([
      loadLandingPageData(cleanSlug),
      getLoggedInCustomerPricing(site.id),
    ]);
    const fallbackHeading =
      landingIntent?.h1 ?? landingIntent?.query ?? cleanSlug.replace(/-/g, " ");
    return (
      <>
        {jsonLdNode}
        <div className="kn-section kn-landing">
          {landing ? (
            <LandingPageContent data={landing} memberPricing={memberPricing} />
          ) : (
            <h1 className="kn-section__title">{fallbackHeading}</h1>
          )}
          <p className="mt-8 text-center">
            <Link href="/collections/all">← Tüm ürünler</Link>
          </p>
        </div>
      </>
    );
  }

  const themeShellCollectionActive =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCollectionSlug(
      slug,
      { themeShell, mirror },
      readThemeShellPilotLive(),
    );

  if (categorySlug?.trim()) {
    const cat = await prisma.storeCategory.findFirst({
      where: { siteId: site.id, slug: categorySlug.trim(), active: true },
    });
    if (!cat) notFound();
    const title = cat.title;

    if (themeShellCollectionActive) {
      const tenant = await ensureStoreTenant();
      return renderThemeShellCollection(
        site.id,
        tenant.databaseUrl,
        locale,
        "all",
        page,
        categorySlug.trim(),
        activeFilters,
        jsonLdNode,
      );
    }

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
    if (themeShellCollectionActive) {
      const tenant = await ensureStoreTenant();
      return renderThemeShellCollection(
        site.id,
        tenant.databaseUrl,
        locale,
        "all",
        page,
        undefined,
        activeFilters,
        jsonLdNode,
      );
    }

    // SEO metin bloğu (Köpek Ödülü açıklaması, SSS, ilgili sayfalar) burada
    // gösterilmez — adanmış landing sayfalarında (findLandingIntentBySlug) yer alır.
    // JSON-LD yapısal veri korunur (görünmez, SEO için).
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
      if (themeShellCollectionActive) {
        const tenant = await ensureStoreTenant();
        return renderThemeShellCollection(
          site.id,
          tenant.databaseUrl,
          locale,
          slug,
          page,
          undefined,
          activeFilters,
          jsonLdNode,
        );
      }
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
