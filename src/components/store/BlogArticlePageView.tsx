import Link from "next/link";
import { normalizeBlogImageUrl } from "@/lib/blog/mirror-blog-inject";
import {
  blogBody,
  blogExcerpt,
  blogPostHref,
  blogTitle,
  formatBlogDateLabel,
  type BlogPostRecord,
} from "@/lib/blog/blog-post-types";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { SearchIntentFaq } from "@/lib/seo/search-intent";
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
  draftPreview = false,
  relatedPosts = [],
  faqs = [],
}: {
  post: BlogPostRecord;
  locale: ShopLocale;
  siteName: string;
  /** Admin taslak önizlemesi */
  draftPreview?: boolean;
  relatedPosts?: BlogPostRecord[];
  /** Şema ile hizalı görünür SSS (map'ten geldiyse) */
  faqs?: SearchIntentFaq[];
}) {
  const title = blogTitle(post, locale);
  const excerpt = blogExcerpt(post, locale);
  const bodyHtml = blogBody(post, locale);
  const dateLabel = formatBlogDateLabel(post.publishedAt, locale);
  const modifiedLabel = formatBlogDateLabel(post.updatedAt ?? null, locale);
  const showModified =
    Boolean(post.updatedAt && post.publishedAt) &&
    post.updatedAt!.getTime() - post.publishedAt!.getTime() > 24 * 60 * 60 * 1000;
  const author = post.author?.trim() || siteName;
  const hero = blogHeroImage(post);
  let bodyPrepared = bodyHtml;
  if (hero && bodyPrepared) {
    bodyPrepared = stripBodyCoverFigure(bodyPrepared);
  }
  const safeBody = bodyPrepared ? sanitizePublicHtml(bodyPrepared) : "";

  return (
    <article className="kn-section kn-blog-article" itemScope itemType="https://schema.org/NewsArticle">
      {draftPreview ? (
        <p className="kn-blog-article__draft" role="status">
          Taslak önizleme — yalnızca siz görüyorsunuz. Yayınlamak için admin panelinden &quot;Yayında&quot; işaretleyin.
        </p>
      ) : null}
      <nav className="kn-blog-article__crumb" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/blogs/news">Blog</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{title}</span>
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
          {showModified && modifiedLabel ? (
            <>
              {dateLabel ? <span aria-hidden="true"> · </span> : null}
              <time dateTime={post.updatedAt?.toISOString()} itemProp="dateModified">
                Güncellendi: {modifiedLabel}
              </time>
            </>
          ) : post.updatedAt ? (
            <meta itemProp="dateModified" content={post.updatedAt.toISOString()} />
          ) : null}
          {dateLabel || showModified ? <span aria-hidden="true"> · </span> : null}
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

      {faqs.length > 0 ? (
        <section className="kn-blog-article__faq" aria-label="Sıkça sorulan sorular">
          <h2 className="kn-blog-article__faq-title">Sıkça sorulan sorular</h2>
          <dl className="kn-blog-article__faq-list">
            {faqs.map((f) => (
              <div key={f.question} className="kn-blog-article__faq-item">
                <dt>{f.question}</dt>
                <dd>{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {relatedPosts.length > 0 ? (
        <aside className="kn-blog-article__related" aria-label="İlgili yazılar">
          <h2 className="kn-blog-article__related-title">İlgili yazılar</h2>
          <ul className="kn-blog-article__related-list">
            {relatedPosts.map((r) => (
              <li key={r.id}>
                <Link href={blogPostHref(r.slug)}>{blogTitle(r, locale)}</Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <footer className="kn-blog-article__footer">
        <Link href="/blogs/news">Tüm yazılar</Link>
      </footer>
    </article>
  );
}
