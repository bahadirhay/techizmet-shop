import { NextResponse } from "next/server";
import { slugify } from "@/lib/admin/slug";
import { revalidateBlogPaths } from "@/lib/blog/revalidate-blog";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function parseDateInput(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const posts = await prisma.storeBlogPost.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Record<string, unknown>;
  const titleTr = String(body.titleTr ?? "").trim();
  if (!titleTr) return NextResponse.json({ error: "Türkçe başlık gerekli" }, { status: 400 });

  const slug = slugify(String(body.slug ?? titleTr));
  const existing = await prisma.storeBlogPost.findFirst({
    where: { siteId: auth.siteId, slug },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
  }

  const post = await prisma.storeBlogPost.create({
    data: {
      siteId: auth.siteId,
      slug,
      titleTr,
      titleEn: String(body.titleEn ?? "").trim() || null,
      excerptTr: String(body.excerptTr ?? "").trim() || null,
      excerptEn: String(body.excerptEn ?? "").trim() || null,
      bodyTr: String(body.bodyTr ?? ""),
      bodyEn: String(body.bodyEn ?? "").trim() || null,
      imageUrl: String(body.imageUrl ?? "").trim() || null,
      author: String(body.author ?? "").trim() || null,
      publishedAt: parseDateInput(body.publishedAt) ?? new Date(),
      published: body.published === true,
      featuredOnHome: body.featuredOnHome === true,
      sortOrder: Number(body.sortOrder) || 0,
      seoTitle: String(body.seoTitle ?? "").trim() || null,
      seoDescription: String(body.seoDescription ?? "").trim() || null,
    },
  });

  revalidateBlogPaths(post.slug, post.published);
  return NextResponse.json({ post });
}
