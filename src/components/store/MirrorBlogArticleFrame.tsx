import { notFound } from "next/navigation";
import { MirrorPageFrameClient } from "@/components/store/MirrorPageFrameClient";
import { getPublishedBlogPostBySlug } from "@/lib/blog/blog-posts-server";
import { blogTitle } from "@/lib/blog/blog-post-types";
import type { ShopLocale } from "@/lib/i18n/locale";
import { buildBlogArticleMirrorSrc } from "@/lib/mirror-html-path";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

/** Blog yazısı — DB içerik + mirror şablon */
export async function MirrorBlogArticleFrame({
  slug,
  locale,
}: {
  slug: string;
  locale: ShopLocale;
}) {
  const site = await getDefaultSite();
  const post = await getPublishedBlogPostBySlug(site.id, slug);
  if (!post) notFound();

  const src = await buildBlogArticleMirrorSrc(slug, locale);
  if (!src) notFound();

  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);

  return (
    <MirrorPageFrameClient
      src={src}
      title={blogTitle(post, locale)}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
