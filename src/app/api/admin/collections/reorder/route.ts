import { NextResponse } from "next/server";
import { revalidateCollectionPaths } from "@/lib/admin/revalidate-collections";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

/** Koleksiyon kart sırası — vitrin /collections grid */
export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { slugs?: string[] };
  const slugs = Array.isArray(body.slugs) ? body.slugs.map(String) : [];
  if (!slugs.length) return NextResponse.json({ error: "slugs gerekli" }, { status: 400 });

  const collections = await prisma.storeCollection.findMany({
    where: { siteId: auth.siteId, slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(collections.map((c) => [c.slug, c.id]));

  const updates = slugs
    .map((slug, index) => {
      const id = bySlug.get(slug);
      if (!id) return null;
      return prisma.storeCollection.update({ where: { id }, data: { sortOrder: index } });
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length) await prisma.$transaction(updates);

  revalidateCollectionPaths();
  return NextResponse.json({ ok: true });
}
