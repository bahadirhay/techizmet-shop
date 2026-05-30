import { NextResponse } from "next/server";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const brand = await prisma.storeBrand.findFirst({
    where: { id, siteId: auth.siteId },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ brand });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeBrand.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = body.name != null ? String(body.name).trim() : undefined;
  const slug =
    body.slug !== undefined ? String(body.slug ?? "").trim() || slugify(String(body.name ?? existing.name)) : undefined;
  const logoUrl = body.logoUrl !== undefined ? String(body.logoUrl ?? "").trim() || null : undefined;
  const active = body.active !== undefined ? Boolean(body.active) : undefined;

  const nextSlug = slug ?? existing.slug;
  if (nextSlug !== existing.slug) {
    const dup = await prisma.storeBrand.findFirst({
      where: { siteId: auth.siteId, slug: nextSlug, NOT: { id } },
    });
    if (dup) return NextResponse.json({ error: "Bu slug zaten kullanılıyor" }, { status: 400 });
  }

  const brand = await prisma.storeBrand.update({
    where: { id },
    data: { name, slug: nextSlug, logoUrl, active },
  });
  return NextResponse.json({ brand });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeBrand.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.storeProduct.updateMany({ where: { brandId: id }, data: { brandId: null } });
  await prisma.storeBrand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
