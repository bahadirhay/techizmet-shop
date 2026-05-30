import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { parseBlocks, serializeBlocks } from "@/lib/blocks/schema";
import { MIRROR_CONTENT_PAGE_SLUGS } from "@/lib/mirror-vitrin-pages";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as { blocks?: string; published?: boolean };

  const page = await prisma.shopPage.findFirst({ where: { id, siteId: auth.siteId } });
  if (!page) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  let blocks: string | undefined;
  if (body.blocks !== undefined) {
    const parsed = parseBlocks(body.blocks);
    if (parsed.length === 0 && body.blocks !== "[]") {
      return NextResponse.json({ error: "Geçersiz blok JSON" }, { status: 400 });
    }
    blocks = serializeBlocks(parsed);
  }

  if (blocks === undefined && body.published === undefined) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await prisma.shopPage.update({
    where: { id },
    data: {
      blocks,
      published: body.published !== undefined ? Boolean(body.published) : undefined,
    },
  });

  if (updated.slug === "home") revalidatePath("/");
  else revalidatePath(`/pages/${updated.slug}`);

  return NextResponse.json({ ok: true, page: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const page = await prisma.shopPage.findFirst({ where: { id, siteId: auth.siteId } });
  if (!page) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (page.slug === "home" || (MIRROR_CONTENT_PAGE_SLUGS as readonly string[]).includes(page.slug)) {
    return NextResponse.json({ error: "Bu sayfa listeden silinemez" }, { status: 400 });
  }

  await prisma.shopPage.delete({ where: { id } });
  revalidatePath(`/pages/${page.slug}`);
  return NextResponse.json({ ok: true });
}
