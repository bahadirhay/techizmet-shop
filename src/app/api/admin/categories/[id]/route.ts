import { NextResponse } from "next/server";
import { revalidateCategoryPaths } from "@/lib/admin/revalidate-categories";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import {
  notifyActiveCategory,
  shouldReindexActiveCategory,
} from "@/lib/seo/publish-notify";

function parseCategoryPatch(body: Record<string, unknown>) {
  return {
    title: body.title != null ? String(body.title).trim() : undefined,
    slug: body.slug !== undefined ? String(body.slug ?? "").trim() || slugify(String(body.title ?? "")) : undefined,
    parentId: body.parentId !== undefined ? (body.parentId ? String(body.parentId) : null) : undefined,
    description:
      body.description !== undefined ? String(body.description ?? "").trim() || null : undefined,
    imageUrl: body.imageUrl !== undefined ? String(body.imageUrl ?? "").trim() || null : undefined,
    seoTitle: body.seoTitle !== undefined ? String(body.seoTitle ?? "").trim() || null : undefined,
    seoDescription:
      body.seoDescription !== undefined ? String(body.seoDescription ?? "").trim() || null : undefined,
    sortOrder: body.sortOrder !== undefined ? parseInt(String(body.sortOrder), 10) || 0 : undefined,
    active: body.active !== undefined ? Boolean(body.active) : undefined,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const category = await prisma.storeCategory.findFirst({
    where: { id, siteId: auth.siteId },
    include: { parent: true, _count: { select: { products: true } } },
  });
  if (!category) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ category });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCategory.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const data = parseCategoryPatch(body);

  if (data.parentId === id) {
    return NextResponse.json({ error: "Kategori kendi üstü olamaz" }, { status: 400 });
  }

  const slug = data.slug ?? existing.slug;
  if (slug !== existing.slug) {
    const dup = await prisma.storeCategory.findFirst({
      where: { siteId: auth.siteId, slug, NOT: { id } },
    });
    if (dup) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
  }

  if (data.parentId) {
    const parent = await prisma.storeCategory.findFirst({
      where: { id: data.parentId, siteId: auth.siteId },
    });
    if (!parent) return NextResponse.json({ error: "Üst kategori bulunamadı" }, { status: 400 });
  }

  const category = await prisma.storeCategory.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      parentId: data.parentId,
      description: data.description,
      imageUrl: data.imageUrl,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      sortOrder: data.sortOrder,
      active: data.active,
    },
  });
  revalidateCategoryPaths(existing.slug);
  if (category.slug !== existing.slug) revalidateCategoryPaths(category.slug);

  if (
    shouldReindexActiveCategory(
      { active: existing.active, slug: existing.slug },
      { active: category.active, slug: category.slug },
      body,
    )
  ) {
    notifyActiveCategory(category.slug);
  }

  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCategory.findFirst({
    where: { id, siteId: auth.siteId },
    include: { _count: { select: { children: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (existing._count.children > 0) {
    return NextResponse.json({ error: "Alt kategorileri önce silin veya taşıyın" }, { status: 400 });
  }

  await prisma.storeProduct.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  await prisma.storeCategory.delete({ where: { id } });
  revalidateCategoryPaths(existing.slug);
  return NextResponse.json({ ok: true });
}
