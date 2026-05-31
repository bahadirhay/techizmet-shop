import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { resolveNavMenuHref, type NavLinkType } from "@/lib/nav-menu-link";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    labelTr?: string;
    labelEn?: string;
    href?: string;
    linkType?: NavLinkType;
    linkTarget?: string | null;
    published?: boolean;
    openInNewTab?: boolean;
    parentId?: string | null;
    menuSlug?: string;
  };

  const existing = await prisma.navMenuItem.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.labelTr !== undefined) data.labelTr = String(body.labelTr);
  if (body.labelEn !== undefined) data.labelEn = String(body.labelEn);
  if (body.linkType !== undefined) data.linkType = body.linkType;
  if (body.linkTarget !== undefined) data.linkTarget = body.linkTarget;
  const linkType = (body.linkType ?? existing.linkType) as NavLinkType;
  const linkTarget = body.linkTarget !== undefined ? body.linkTarget : existing.linkTarget;
  const customHref = body.href !== undefined ? body.href : existing.href;
  if (
    body.linkType !== undefined ||
    body.linkTarget !== undefined ||
    body.href !== undefined
  ) {
    data.href = resolveNavMenuHref(linkType, linkTarget, customHref);
  }
  if (body.published !== undefined) data.published = !!body.published;
  if (body.openInNewTab !== undefined) data.openInNewTab = !!body.openInNewTab;
  if (body.menuSlug !== undefined) {
    data.menuSlug = body.menuSlug === "footer" ? "footer" : "header";
  }
  if (body.parentId !== undefined) {
    if (body.parentId === id) {
      return NextResponse.json({ error: "Öğe kendi üstü olamaz" }, { status: 400 });
    }
    data.parentId = body.parentId;
  }

  try {
    const row = await prisma.navMenuItem.update({ where: { id }, data });
    revalidateStorePublicCache(auth.siteId);
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Güncelleme başarısız";
    if (msg.includes("Unknown argument `linkType`")) {
      return NextResponse.json(
        {
          error:
            "Prisma client güncel değil. Dev sunucusunu durdurun, npx prisma generate çalıştırın, .next klasörünü silin ve yeniden başlatın.",
        },
        { status: 503 },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const existing = await prisma.navMenuItem.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  await prisma.navMenuItem.delete({ where: { id } });
  revalidateStorePublicCache(auth.siteId);
  return NextResponse.json({ ok: true });
}
