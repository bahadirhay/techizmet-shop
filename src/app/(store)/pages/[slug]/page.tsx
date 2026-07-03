import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseBlocks } from "@/lib/blocks/schema";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { mirrorStaticPageHtmlExists } from "@/lib/mirror-html-path";
import {
  MIRROR_CONTENT_PAGE_SLUGS,
  isVitrinPageKey,
  type VitrinPageKey,
} from "@/lib/mirror-vitrin-pages";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { getPageBySlug } from "@/lib/site";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { MirrorStaticPageFrame } from "@/components/store/MirrorStaticPageFrame";
import { MirrorCmsPageFrame } from "@/components/store/MirrorCmsPageFrame";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { DistanceSalesAgreementView } from "@/components/legal/DistanceSalesAgreementView";
import { buildWebPageJsonLd } from "@/lib/seo/site-json-ld";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";

function isMirrorContentPageSlug(slug: string): slug is VitrinPageKey {
  return (
    isVitrinPageKey(slug) &&
    (MIRROR_CONTENT_PAGE_SLUGS as readonly string[]).includes(slug)
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  const base = await buildSiteMetadata();
  if (!page) return base;
  return buildPageMetadata(base, {
    title: page.seoTitle?.trim() || page.title,
    description: page.seoDescription?.trim() || base.description,
    canonicalPath: `/pages/${slug}`,
  });
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);

  if (homepageMode === "mirror" && isMirrorContentPageSlug(slug)) {
    return <MirrorVitrinFrame pageKey={slug} />;
  }

  if (homepageMode === "mirror" && mirrorStaticPageHtmlExists(slug)) {
    return <MirrorStaticPageFrame slug={slug} locale={locale} />;
  }

  const page = await getPageBySlug(slug);
  if (!page?.published) notFound();

  if (slug === "mesafeli-satis") {
    if (homepageMode === "mirror") {
      return <MirrorCmsPageFrame slug={slug} locale={locale} title={page.title} />;
    }
    const profile = resolveLegalSellerProfile(settings, site);
    return (
      <div className="kn-section kn-distance-sales-page-wrap">
        <DistanceSalesAgreementView seller={profile} />
      </div>
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorCmsPageFrame slug={slug} locale={locale} title={page.title} />;
  }

  const blocks = parseBlocks(page.blocks);
  const messages = getStoreMessages(locale);
  const jsonLd = buildWebPageJsonLd({
    name: page.seoTitle?.trim() || page.title,
    description: page.seoDescription,
    path: `/pages/${slug}`,
    siteName: site.name,
  });
  return (
    <>
      <JsonLdScript data={jsonLd} />
      <article>
        <h1 className="kn-section__title" style={{ paddingTop: "2rem" }}>
          {page.title}
        </h1>
        <StorePublicBlocks
          blocks={blocks}
          messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
        />
      </article>
    </>
  );
}
