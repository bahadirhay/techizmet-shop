import Link from "next/link";
import { normalizeBlogImageUrl } from "@/lib/blog/mirror-blog-inject";
import {
  blogBody,
  blogExcerpt,
  blogTitle,
  formatBlogDateLabel,
  type BlogPostRecord,
} from "@/lib/blog/blog-post-types";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import type { ShopLocale } from "@/lib/i18n/locale";
import { toAbsoluteMediaUrl } from "@/lib/seo/site-url";

function blogHeroImage(post: BlogPostRecord): string | null {
  const raw = post.imageUrl?.trim();
  if (!raw) return null;
  const normalized = normalizeBlogImageUrl(raw);
  return toAbsoluteMediaUrl(normalized) ?? normalized;
}

/** Otomasyonun body'ye eklediği kapak — üstte ayrı gösterilince çift görsel olmasın */
function stripBodyCoverFigure(html: string): string {
  return html
    .replace(/<figure[^>]*\bkn-blog-hero\b[^>]*>[\s\S]*?<\/figure>\s*/gi, "")
    .trim();
}

/** Blog yazısı — doğrudan HTML (Google / Haberler için iframe yok) */
export function BlogArticlePageView({
  post,
  locale,
  siteName,
}: {
  post: BlogPostRecord;
  locale: ShopLocale;
  siteName: string;
}) {
  const title = blogTitle(post, locale);
  const excerpt = blogExcerpt(post, locale);
  const bodyHtml = blogBody(post, locale);
  const dateLabel = formatBlogDateLabel(post.publishedAt, locale);
  const author = post.author?.trim() || siteName;
  const hero = blogHeroImage(post);
  let bodyPrepared = bodyHtml;
  if (hero && bodyPrepared) {
    bodyPrepared = stripBodyCoverFigure(bodyPrepared);
  }
  const safeBody = bodyPrepared ? sanitizePublicHtml(bodyPrepared) : "";

  return (
    <article className="kn-section kn-blog-article" itemScope itemType="https://schema.org/NewsArticle">
      <nav className="kn-blog-article__nav" aria-label="Blog">
        <Link href="/blogs/news">← Blog</Link>
      </nav>

      <header className="kn-blog-article__header">
        <h1 className="kn-blog-article__title" itemProp="headline">
          {title}
        </h1>
        {excerpt ? <p className="kn-blog-article__excerpt">{excerpt}</p> : null}
        <p className="kn-blog-article__meta">
          {dateLabel ? (
            <time dateTime={post.publishedAt?.toISOString()} itemProp="datePublished">
              {dateLabel}
            </time>
          ) : null}
          {dateLabel ? <span aria-hidden="true"> · </span> : null}
          <span itemProp="author">{author}</span>
        </p>
      </header>

      {hero ? (
        <figure className="kn-blog-article__hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt={title} className="kn-blog-article__hero-img" itemProp="image" />
        </figure>
      ) : null}

      {safeBody ? (
        <div
          className="kn-blog-article__body kn-prose"
          itemProp="articleBody"
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />
      ) : (
        <p className="kn-blog-article__empty">İçerik yakında.</p>
      )}

      <footer className="kn-blog-article__footer">
        <Link href="/blogs/news">Tüm yazılar</Link>
      </footer>
    </article>
  );
}
