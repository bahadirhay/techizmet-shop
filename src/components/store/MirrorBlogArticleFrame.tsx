import { notFound } from "next/navigation";
import { MirrorPageFrameClient } from "@/components/store/MirrorPageFrameClient";
import { getPublishedBlogPostBySlug } from "@/lib/blog/blog-posts-server";
import { blogTitle } from "@/lib/blog/blog-post-types";
import type { ShopLocale } from "@/lib/i18n/locale";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { resolveMirrorBlogArticleTemplateSlug } from "@/lib/mirror-html-path";
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

  const templateSlug = resolveMirrorBlogArticleTemplateSlug(slug);
  if (!templateSlug) notFound();

  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);

  const src = toBrandedMirrorSrc(
    locale === "tr"
      ? `theme/king-noor/mirror/blogs/news/${templateSlug}-tr.html`
      : `theme/king-noor/mirror/blogs/news/${templateSlug}.html`,
    undefined,
    { blogSlug: slug },
  );

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
