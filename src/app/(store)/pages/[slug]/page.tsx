import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { parseBlocks } from "@/lib/blocks/schema";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { mirrorStaticPageHtmlExists } from "@/lib/mirror-html-path";
import { isVitrinPageKey, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { getPageBySlug } from "@/lib/site";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { MirrorStaticPageFrame } from "@/components/store/MirrorStaticPageFrame";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  const base = await buildSiteMetadata();
  if (!page) return base;
  return {
    ...base,
    title: page.seoTitle?.trim() || page.title,
    description: page.seoDescription?.trim() || base.description,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);

  if (homepageMode === "mirror" && isVitrinPageKey(slug)) {
    return <MirrorVitrinFrame pageKey={slug as VitrinPageKey} />;
  }

  if (homepageMode === "mirror" && mirrorStaticPageHtmlExists(slug)) {
    return <MirrorStaticPageFrame slug={slug} locale={locale} />;
  }

  const page = await getPageBySlug(slug);
  if (!page?.published) notFound();
  const blocks = parseBlocks(page.blocks);
  const messages = getStoreMessages(locale);
  return (
    <article>
      <h1 className="kn-section__title" style={{ paddingTop: "2rem" }}>
        {page.title}
      </h1>
      <StorePublicBlocks
        blocks={blocks}
        messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
      />
    </article>
  );
}
