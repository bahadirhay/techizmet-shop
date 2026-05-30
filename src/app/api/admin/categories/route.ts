import { NextResponse } from "next/server";
import { revalidateCategoryPaths } from "@/lib/admin/revalidate-categories";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function parseCategoryBody(body: Record<string, unknown>) {
  return {
    title: String(body.title ?? "").trim(),
    slug: String(body.slug ?? "").trim() || undefined,
    parentId: body.parentId ? String(body.parentId) : null,
    description: String(body.description ?? "").trim() || null,
    imageUrl: String(body.imageUrl ?? "").trim() || null,
    seoTitle: String(body.seoTitle ?? "").trim() || null,
    seoDescription: String(body.seoDescription ?? "").trim() || null,
    sortOrder: body.sortOrder != null ? parseInt(String(body.sortOrder), 10) || 0 : 0,
    active: body.active !== undefined ? Boolean(body.active) : undefined,
  };
}

export async function GET() {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const categories = await prisma.storeCategory.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      parent: { select: { id: true, title: true } },
      _count: { select: { products: true, children: true } },
    },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const data = parseCategoryBody(body);
  if (!data.title) return NextResponse.json({ error: "Kategori adı gerekli" }, { status: 400 });

  const slug = data.slug || slugify(data.title);
  const dup = await prisma.storeCategory.findFirst({ where: { siteId: auth.siteId, slug } });
  if (dup) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });

  if (data.parentId) {
    const parent = await prisma.storeCategory.findFirst({
      where: { id: data.parentId, siteId: auth.siteId },
    });
    if (!parent) return NextResponse.json({ error: "Üst kategori bulunamadı" }, { status: 400 });
  }

  const category = await prisma.storeCategory.create({
    data: {
      siteId: auth.siteId,
      title: data.title,
      slug,
      parentId: data.parentId,
      description: data.description,
      imageUrl: data.imageUrl,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      sortOrder: data.sortOrder,
      active: data.active ?? true,
    },
  });
  revalidateCategoryPaths(slug);
  return NextResponse.json({ category });
}
