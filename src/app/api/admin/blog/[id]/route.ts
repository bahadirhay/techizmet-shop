import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/admin/slug";
import { revalidateBlogPaths } from "@/lib/blog/revalidate-blog";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import { notifySearchEnginesForBlogSlug } from "@/lib/seo/notify-search-engines";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function sanitizeOptionalHtml(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  const s = String(v ?? "").trim();
  return s ? sanitizePublicHtml(s) : null;
}

function parseDateInput(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const post = await prisma.storeBlogPost.findFirst({ where: { id, siteId: auth.siteId } });
  if (!post) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;

  const current = await prisma.storeBlogPost.findFirst({ where: { id, siteId: auth.siteId } });
  if (!current) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  let slug = current.slug;
  if (body.slug !== undefined) {
    slug = slugify(String(body.slug));
    if (slug !== current.slug) {
      const clash = await prisma.storeBlogPost.findFirst({
        where: { siteId: auth.siteId, slug, NOT: { id } },
      });
      if (clash) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
    }
  }

  const publishedAt = parseDateInput(body.publishedAt);

  const post = await prisma.storeBlogPost.update({
    where: { id },
    data: {
      slug,
      titleTr: body.titleTr !== undefined ? String(body.titleTr).trim() : undefined,
      titleEn: body.titleEn !== undefined ? String(body.titleEn).trim() || null : undefined,
      excerptTr: sanitizeOptionalHtml(body.excerptTr),
      excerptEn: sanitizeOptionalHtml(body.excerptEn),
      bodyTr:
        body.bodyTr !== undefined ? sanitizePublicHtml(String(body.bodyTr)) : undefined,
      bodyEn: sanitizeOptionalHtml(body.bodyEn),
      imageUrl: body.imageUrl !== undefined ? String(body.imageUrl).trim() || null : undefined,
      author: body.author !== undefined ? String(body.author).trim() || null : undefined,
      publishedAt,
      published: body.published !== undefined ? Boolean(body.published) : undefined,
      featuredOnHome: body.featuredOnHome !== undefined ? Boolean(body.featuredOnHome) : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : undefined,
      seoTitle: body.seoTitle !== undefined ? String(body.seoTitle).trim() || null : undefined,
      seoDescription:
        body.seoDescription !== undefined ? String(body.seoDescription).trim() || null : undefined,
    },
  });

  revalidateBlogPaths(current.slug, current.published);
  revalidateBlogPaths(post.slug, post.published);
  if (post.published && (!current.published || current.slug !== post.slug)) {
    notifySearchEnginesForBlogSlug(post.slug);
  }
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const post = await prisma.storeBlogPost.findFirst({ where: { id, siteId: auth.siteId } });
  if (!post) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.storeBlogPost.delete({ where: { id } });
  revalidateBlogPaths(post.slug, post.published);
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
