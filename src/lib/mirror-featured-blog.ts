import { setBlogImageInHtmlChunk } from "@/lib/blog/mirror-blog-inject";
import { blogPostHref } from "@/lib/blog/blog-post-types";
import {
  BLOG_ITEM_OPEN_TOKEN,
  normalizeBlogItemHtml,
  patchBlogLinksInChunk,
  reassembleBlogItemHtml,
  splitBlogItemHtmlParts,
} from "@/lib/mirror-blog-item-html";
import type { MirrorPageConfig } from "@/lib/mirror-home-overlay";
import { htmlToPlainText } from "@/lib/html-plain-text";
import type { ShopLocale } from "@/lib/i18n/locale";

export const FEATURED_BLOG_SECTION_KEY = "featured_blog_9VzA3J";

export type FeaturedBlogPostData = {
  postId: string;
  imageUrl?: string;
  href?: string;
  titleTr?: string;
  titleEn?: string;
  descTr?: string;
  descEn?: string;
  dateLabel?: string;
  author?: string;
};

export type FeaturedBlogPostEdit = FeaturedBlogPostData;

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i");
  return html.match(re)?.[0] ?? "";
}

function postIdFromHref(href: string): string {
  const m = href.match(/\/([^/]+?)(?:\.html)?$/i);
  return m?.[1] ?? `post-${href.length}`;
}

function pickImageUrl(chunk: string): string | undefined {
  const raw =
    chunk.match(/data-original="([^"]+)"/i)?.[1] ??
    chunk.match(/\ssrc="(\/theme\/techizmet-shop\/[^"?]+)/i)?.[1];
  return raw?.split("?")[0]?.trim();
}

/** Mirror HTML — öne çıkan blog kartları */
export function extractFeaturedBlogPostsFromHtml(
  html: string,
  sectionKey: string,
): FeaturedBlogPostData[] {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return [];

  const posts: FeaturedBlogPostData[] = [];
  const parts = normalizeBlogItemHtml(block).split(BLOG_ITEM_OPEN_TOKEN);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const href =
      chunk.match(/class="blog--title[^"]*"[^>]*href="([^"]+)"/i)?.[1] ??
      chunk.match(/href="([^"]+)"[^>]*class="blog--title/i)?.[1] ??
      chunk.match(/class="blog--image[^"]*"[^>]*href="([^"]+)"/i)?.[1] ??
      chunk.match(/href="([^"]+)"[^>]*class="blog--image/i)?.[1];
    if (!href) continue;

    const postId = postIdFromHref(href);
    const titleHtml =
      chunk.match(/class="blog--title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ??
      chunk.match(/href="[^"]+"[^>]*class="blog--title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const title = titleHtml ? htmlToPlainText(titleHtml).trim() : "";
    const descHtml = chunk.match(/class="blog--desc"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const desc = descHtml ? htmlToPlainText(descHtml).trim() : "";
    const dateLabel = chunk.match(/class="blog--data[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim();
    const author = chunk.match(/author--name[^>]*>([^<]+)</i)?.[1]?.trim();

    posts.push({
      postId,
      href: href.trim(),
      imageUrl: pickImageUrl(chunk),
      titleTr: title,
      titleEn: title,
      descTr: desc,
      descEn: desc,
      dateLabel,
      author,
    });
  }
  return posts;
}

export function mergeFeaturedBlogEdits(
  defaults: FeaturedBlogPostData[] | undefined,
  saved: FeaturedBlogPostEdit[] | undefined,
): FeaturedBlogPostEdit[] {
  const byId = new Map((saved ?? []).map((p) => [p.postId, p]));
  if (!defaults?.length) return saved ?? [];
  return defaults.map((d) => ({ ...d, ...byId.get(d.postId) }));
}

function setBlogImage(item: Element, url: string, alt?: string) {
  const base = url.split("?")[0]?.replace(/\{width\}/gi, "") ?? "";
  if (!base) return;
  item.querySelectorAll(".blog--image img, .blog--item img").forEach((img) => {
    const el = img as HTMLImageElement;
    el.classList.remove("lazyload");
    el.classList.add("lazyloaded", "kn-blog-card-img");
    el.src = base;
    el.setAttribute("data-src", base);
    el.setAttribute("data-original", base);
    el.loading = "eager";
    el.removeAttribute("srcset");
    if (alt) el.alt = alt;
  });
  const noscript = item.querySelector(".blog--image noscript img, noscript img");
  if (noscript) {
    const el = noscript as HTMLImageElement;
    el.src = base;
    if (alt) el.alt = alt;
  }
}

function titleForLocale(post: FeaturedBlogPostEdit, locale: ShopLocale): string {
  if (locale === "en") return (post.titleEn ?? post.titleTr ?? "").trim();
  return (post.titleTr ?? post.titleEn ?? "").trim();
}

function descForLocale(post: FeaturedBlogPostEdit, locale: ShopLocale): string {
  if (locale === "en") return (post.descEn ?? post.descTr ?? "").trim();
  return (post.descTr ?? post.descEn ?? "").trim();
}

/** Vitrin iframe — blog kartları */
export function applyFeaturedBlogPostsToSection(
  section: Element,
  posts: FeaturedBlogPostEdit[],
  locale: ShopLocale = "tr",
) {
  const items = section.querySelectorAll(".blog--item");
  const byId = new Map(posts.map((p) => [p.postId, p]));

  items.forEach((item, index) => {
    const link = item.querySelector('a.blog--title, a.blog--image') as HTMLAnchorElement | null;
    const href = link?.getAttribute("href") ?? "";
    const postId = postIdFromHref(href);
    const post = byId.get(postId) ?? posts[index];
    if (!post) return;

    const title = titleForLocale(post, locale);
    const img = post.imageUrl?.trim();
  if (img) setBlogImage(item, img, title);

    if (post.href?.trim()) {
      item.querySelectorAll('a.blog--title, a.blog--image').forEach((a) => {
        (a as HTMLAnchorElement).href = post.href!.trim();
      });
    }

    const titleEl = item.querySelector(".blog--title");
    if (titleEl && title) {
      titleEl.textContent = title;
      (titleEl as HTMLAnchorElement).setAttribute("aria-label", `${title} Blog Yazısı`);
    }

    const desc = descForLocale(post, locale);
    const descEl = item.querySelector(".blog--desc");
    if (descEl && desc) descEl.textContent = desc;

    if (post.dateLabel?.trim()) {
      const dateEl = item.querySelector(".blog--data:not(.author--name)");
      if (dateEl) dateEl.textContent = post.dateLabel.trim();
    }
    if (post.author?.trim()) {
      const authorEl = item.querySelector(".author--name");
      if (authorEl) authorEl.textContent = post.author.trim();
    }
  });
}

function escapeHtmlText(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function patchFeaturedBlogItemHtml(
  chunk: string,
  post: FeaturedBlogPostEdit,
  locale: ShopLocale,
) {
  const title = titleForLocale(post, locale);
  const desc = descForLocale(post, locale);
  const href = post.href?.trim() || blogPostHref(post.postId);
  let out = patchBlogLinksInChunk(chunk, href);
  const img = post.imageUrl?.trim();
  if (img) out = setBlogImageInHtmlChunk(out, img, title);
  if (title) {
    out = out.replace(
      /class="blog--title[^"]*"[^>]*>[\s\S]*?<\/a>/i,
      `class="blog--title h6 heading-font" aria-label="${escapeHtmlText(title)}">${escapeHtmlText(title)}</a>`,
    );
  }
  if (desc) {
    out = out.replace(
      /<p class="blog--desc">[\s\S]*?<\/p>/i,
      `<p class="blog--desc">${escapeHtmlText(desc)}</p>`,
    );
  }
  if (post.dateLabel?.trim()) {
    out = out.replace(
      /<li class="blog--data[^"]*">[^<]*<\/li>/i,
      `<li class="blog--data text-small">${escapeHtmlText(post.dateLabel.trim())}</li>`,
    );
  }
  if (post.author?.trim()) {
    out = out.replace(
      /<li class="blog--data[^"]* author--name">[^<]*<\/li>/i,
      `<li class="blog--data text-small author--name">${escapeHtmlText(post.author.trim())}</li>`,
    );
  }
  return out;
}

/** Eski normalizeBlogItemHtml artefaktı — kartlar arası fazla </div> */
function repairFeaturedBlogStackedHtml(sectionHtml: string): string {
  return sectionHtml.replace(
    /(<\/div>\s*<\/div>)\s*<\/div>(\s*<div class="blog--item)/gi,
    "$1$2",
  );
}

/** Ana sayfa featured-blog — herhangi bir pipeline adımından sonra düzeni onar */
export function repairFeaturedBlogSectionInHtml(html: string): string {
  const sectionBlock = sliceSectionHtml(html, FEATURED_BLOG_SECTION_KEY);
  if (!sectionBlock) return html;
  const repaired = repairFeaturedBlogStackedHtml(sectionBlock);
  return repaired === sectionBlock ? html : html.replace(sectionBlock, repaired);
}

/** Sunucu — ana sayfa öne çıkan blog (DB); yalnızca featured-blog bölümü */
export function applyFeaturedBlogPostsToHtml(
  html: string,
  posts: FeaturedBlogPostEdit[],
  locale: ShopLocale = "tr",
) {
  const sectionBlock = sliceSectionHtml(html, FEATURED_BLOG_SECTION_KEY);
  if (!sectionBlock) return html;

  const byId = new Map(posts.map((p) => [p.postId, p]));
  const { prefix, items, suffix } = splitBlogItemHtmlParts(sectionBlock, { normalize: false });
  if (!items.length) return html;

  const patched = items.map((chunk, index) => {
    const href = chunk.match(/href="([^"]+)"/i)?.[1] ?? "";
    const postId = postIdFromHref(href);
    const post = byId.get(postId) ?? posts[index];
    if (!post) {
      return chunk.replace(/^\s*/, ' style="display:none!important" ');
    }
    return patchFeaturedBlogItemHtml(chunk, post, locale);
  });

  const patchedSection = repairFeaturedBlogStackedHtml(
    reassembleBlogItemHtml(prefix, patched, suffix),
  );
  return html.replace(sectionBlock, patchedSection);
}

export function mergeFeaturedBlogIntoPageConfig(
  config: MirrorPageConfig,
  posts: FeaturedBlogPostEdit[],
): MirrorPageConfig {
  if (!posts.length) return config;
  const sections = { ...config.sections };
  const key =
    Object.keys(sections).find((k) => k.includes("featured_blog")) ?? FEATURED_BLOG_SECTION_KEY;
  sections[key] = { ...(sections[key] ?? {}), featuredBlogPosts: posts };
  return { ...config, sections };
}
