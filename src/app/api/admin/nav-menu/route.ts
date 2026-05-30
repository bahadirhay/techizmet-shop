import { NextResponse } from "next/server";
import { resolveNavMenuHref, type NavLinkType } from "@/lib/nav-menu-link";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const items = await prisma.navMenuItem.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { labelTr: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    labelTr?: string;
    labelEn?: string;
    href?: string;
    linkType?: NavLinkType;
    linkTarget?: string | null;
    parentId?: string | null;
    published?: boolean;
    openInNewTab?: boolean;
    menuSlug?: string;
  };
  const labelTr = body.labelTr?.trim() || "Yeni menü";
  const labelEn = body.labelEn?.trim() || "New menu";
  const linkType = body.linkType ?? "url";
  const linkTarget = body.linkTarget ?? null;
  const href = resolveNavMenuHref(linkType, linkTarget, body.href);
  const parentId = body.parentId === undefined ? null : body.parentId;
  const menuSlug = body.menuSlug === "footer" ? "footer" : "header";

  const agg = await prisma.navMenuItem.aggregate({
    where: { siteId: auth.siteId, parentId, menuSlug },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max?.sortOrder ?? -1) + 1;

  try {
    const row = await prisma.navMenuItem.create({
      data: {
        siteId: auth.siteId,
        labelTr,
        labelEn,
        linkType,
        linkTarget,
        href,
        parentId,
        menuSlug,
        sortOrder,
        published: body.published ?? true,
        openInNewTab: body.openInNewTab ?? false,
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kayıt başarısız";
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
