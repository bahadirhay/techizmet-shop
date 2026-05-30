import { NextResponse } from "next/server";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function parseBrandBody(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? "").trim(),
    slug: String(body.slug ?? "").trim() || undefined,
    logoUrl: String(body.logoUrl ?? "").trim() || null,
    active: body.active !== undefined ? Boolean(body.active) : undefined,
  };
}

export async function GET() {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const brands = await prisma.storeBrand.findMany({
    where: { siteId: auth.siteId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ brands });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const data = parseBrandBody(body);
  if (!data.name) return NextResponse.json({ error: "Marka adı gerekli" }, { status: 400 });

  const slug = data.slug || slugify(data.name);
  const dup = await prisma.storeBrand.findFirst({ where: { siteId: auth.siteId, slug } });
  if (dup) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });

  const brand = await prisma.storeBrand.create({
    data: {
      siteId: auth.siteId,
      name: data.name,
      slug,
      logoUrl: data.logoUrl,
      active: data.active ?? true,
    },
  });
  return NextResponse.json({ brand });
}
