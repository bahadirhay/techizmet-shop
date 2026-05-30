import { NextResponse } from "next/server";
import { revalidateCollectionPaths } from "@/lib/admin/revalidate-collections";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function parseCollectionBody(body: Record<string, unknown>) {
  return {
    title: String(body.title ?? "").trim(),
    slug: String(body.slug ?? "").trim() || undefined,
    description: String(body.description ?? "").trim() || null,
    imageUrl: String(body.imageUrl ?? "").trim() || null,
    sortOrder: body.sortOrder != null ? parseInt(String(body.sortOrder), 10) || 0 : 0,
  };
}

export async function GET() {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;
  const collections = await prisma.storeCollection.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ collections });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const data = parseCollectionBody(body);
  if (!data.title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const slug = data.slug || slugify(data.title);
  const dup = await prisma.storeCollection.findFirst({ where: { siteId: auth.siteId, slug } });
  if (dup) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });

  const collection = await prisma.storeCollection.create({
    data: {
      siteId: auth.siteId,
      title: data.title,
      slug,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder,
      published: true,
    },
  });
  revalidateCollectionPaths(slug);
  return NextResponse.json({ collection });
}
