import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function PUT(req: Request) {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { parentId?: string | null; orderedIds?: string[] };
  const parentId = body.parentId === undefined ? null : body.parentId;
  const ids = body.orderedIds;
  if (!ids?.length) {
    return NextResponse.json({ error: "orderedIds gerekli" }, { status: 400 });
  }

  const first = await prisma.navMenuItem.findFirst({
    where: { id: ids[0]!, siteId: auth.siteId },
    select: { menuSlug: true },
  });
  if (!first) {
    return NextResponse.json({ error: "Geçersiz öğe" }, { status: 400 });
  }
  const menuSlug = first.menuSlug;

  const siblings = await prisma.navMenuItem.findMany({
    where: { siteId: auth.siteId, parentId, menuSlug },
    select: { id: true },
  });
  const set = new Set(siblings.map((s) => s.id));
  if (ids.length !== siblings.length || !ids.every((i) => set.has(i))) {
    return NextResponse.json({ error: "Aynı üst öğedeki tüm satırları gönderin" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.navMenuItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
  revalidateStorePublicCache(auth.siteId);
  return NextResponse.json({ ok: true });
}
