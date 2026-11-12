import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { ThemeShellHomeView } from "@/components/store/ThemeShellHomeView";
import { CollectionSeoContent } from "@/components/store/CollectionSeoContent";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { buildFaqPageJsonLd, buildItemListJsonLd } from "@/lib/seo/json-ld";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { getStoreLocale } from "@/lib/i18n/server";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreHomepageBlocks } from "@/lib/store-homepage-blocks";
import { getHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { resolveThemeShellHomeContent } from "@/lib/theme-shell-home-content";
import {
  isThemeShellEnabledForHomePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { loadHomeSeoContent } from "@/lib/seo/collection-seo-content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Ana sayfa meta — hedef kelimeli varsayılanlar buildSiteMetadata içinde
  const base = await buildSiteMetadata();
  const title = base.title;
  const homeTitle =
    title && typeof title === "object" && "default" in title ? title.default : null;
  // Kök layout'un "%s · Marka" şablonu ana sayfa başlığına tekrar uygulanmasın
  // ("… | Anatolian Paw · Anatolian Paw") — başlık olduğu gibi kullanılır.
  return homeTitle ? { ...base, title: { absolute: homeTitle } } : base;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const query = await searchParams;
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForHomePath("/", query, themeShellLive);
  const homeSeo = await loadHomeSeoContent();
  // Yapısal veri — sayfada görünen ürün listesi ve SSS ile birebir aynı içerik
  const homeJsonLd = homeSeo
    ? [
        ...(homeSeo.products.length
          ? [
              buildItemListJsonLd(
                homeSeo.products.map((p) => ({ name: p.name, url: `/products/${p.slug}` })),
                homeSeo.heading,
                "/",
              ),
            ]
          : []),
        ...(homeSeo.faqs.length ? [buildFaqPageJsonLd(homeSeo.faqs, "/")] : []),
      ]
    : [];
  const seoBlock = homeSeo ? (
    <>
      {homeJsonLd.length ? <JsonLdScript data={homeJsonLd} /> : null}
      <CollectionSeoContent
        heading={homeSeo.heading}
        intro={homeSeo.intro}
        criteria={homeSeo.criteria}
        products={homeSeo.products}
        faqs={homeSeo.faqs}
        relatedLinks={homeSeo.relatedLinks}
      />
    </>
  ) : null;

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const tenant = await ensureStoreTenant();
    const content = await resolveThemeShellHomeContent(
      site.id,
      site.name,
      tenant.slug,
      locale,
    );
    if (!content) notFound();
    return (
      <>
        <ThemeShellHomeView content={content} />
        {seoBlock}
      </>
    );
  }

  if (homepageMode === "mirror") {
    return (
      <>
        <MirrorVitrinFrame pageKey="home" />
        {seoBlock}
      </>
    );
  }

  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const blocks = await getStoreHomepageBlocks(locale);
  return (
    <>
      <StorePublicBlocks
        blocks={blocks}
        messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
      />
      {seoBlock}
    </>
  );
}
