import { NextResponse } from "next/server";
import { revalidateCollectionPaths } from "@/lib/admin/revalidate-collections";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  notifyPublishedCollection,
  shouldReindexPublishedCollection,
} from "@/lib/seo/publish-notify";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const collection = await prisma.storeCollection.findFirst({
    where: { id, siteId: auth.siteId },
    include: { _count: { select: { products: true } } },
  });
  if (!collection) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ collection });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCollection.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const title = body.title != null ? String(body.title).trim() : undefined;
  const slug =
    body.slug !== undefined
      ? String(body.slug ?? "").trim() || slugify(String(body.title ?? existing.title))
      : undefined;
  const description =
    body.description !== undefined ? String(body.description ?? "").trim() || null : undefined;
  const imageUrl = body.imageUrl !== undefined ? String(body.imageUrl ?? "").trim() || null : undefined;
  const sortOrder = body.sortOrder !== undefined ? parseInt(String(body.sortOrder), 10) || 0 : undefined;
  const published = body.published !== undefined ? Boolean(body.published) : undefined;

  const nextSlug = slug ?? existing.slug;
  if (nextSlug !== existing.slug) {
    const dup = await prisma.storeCollection.findFirst({
      where: { siteId: auth.siteId, slug: nextSlug, NOT: { id } },
    });
    if (dup) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
  }

  const data: Prisma.StoreCollectionUpdateInput = {};
  if (title !== undefined) data.title = title;
  if (slug !== undefined || nextSlug !== existing.slug) data.slug = nextSlug;
  if (description !== undefined) data.description = description;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (published !== undefined) data.published = published;

  const collection = await prisma.storeCollection.update({ where: { id }, data });
  revalidateCollectionPaths(existing.slug);
  if (nextSlug !== existing.slug) revalidateCollectionPaths(nextSlug);

  const nextPublished = published ?? existing.published;
  if (
    shouldReindexPublishedCollection(
      { published: existing.published, slug: existing.slug },
      { published: nextPublished, slug: nextSlug },
      body,
    )
  ) {
    notifyPublishedCollection(nextSlug);
  }

  return NextResponse.json({ collection });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCollection.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.storeProduct.updateMany({ where: { collectionId: id }, data: { collectionId: null } });
  await prisma.storeCollection.delete({ where: { id } });
  revalidateCollectionPaths(existing.slug);
  return NextResponse.json({ ok: true });
}
