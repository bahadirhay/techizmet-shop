import { NextResponse } from "next/server";
import {
  fetchInstagramOembed,
  instagramOembedToPostPatch,
} from "@/lib/instagram-url";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

function trimOrNull(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    published?: boolean;
    sortOrder?: number;
    title?: string | null;
    linkHref?: string | null;
    linkLabel?: string | null;
    coverImage?: string | null;
  };
  const data: Record<string, unknown> = {};
  if (body.published !== undefined) data.published = !!body.published;
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

  const title = trimOrNull(body.title, 200);
  if (title !== undefined) data.title = title;
  const linkHref = trimOrNull(body.linkHref, 500);
  if (linkHref !== undefined) data.linkHref = linkHref;
  const linkLabel = trimOrNull(body.linkLabel, 120);
  if (linkLabel !== undefined) data.linkLabel = linkLabel;
  const coverImage = trimOrNull(body.coverImage, 2000);
  if (coverImage !== undefined) data.coverImage = coverImage;

  const existing = await prisma.storeInstagramPost.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  }

  const row = await prisma.storeInstagramPost.update({
    where: { id },
    data: data as {
      published?: boolean;
      sortOrder?: number;
      title?: string | null;
      linkHref?: string | null;
      linkLabel?: string | null;
      coverImage?: string | null;
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeInstagramPost.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  }
  await prisma.storeInstagramPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeInstagramPost.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  }

  const oembed = await fetchInstagramOembed(existing.permalink);
  if (!oembed?.thumbnail_url) {
    return NextResponse.json(
      { error: "Instagram önizlemesi alınamadı — bir süre sonra tekrar deneyin" },
      { status: 502 },
    );
  }

  const meta = instagramOembedToPostPatch(existing.permalink, oembed, existing);
  const row = await prisma.storeInstagramPost.update({
    where: { id },
    data: {
      thumbnailUrl: oembed.thumbnail_url,
      mediaUrl: oembed.thumbnail_url,
      ...meta,
    },
  });
  return NextResponse.json(row);
}
