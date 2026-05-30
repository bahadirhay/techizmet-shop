import { NextResponse } from "next/server";
import { ensureEditorBlocks } from "@/lib/blocks/editor-ids";
import { importMirrorHomeToShopPage, markMirrorHomeImported } from "@/lib/import-mirror-home-page";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const page = await prisma.shopPage.findFirst({ where: { id, siteId: auth.siteId } });
  if (!page) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (page.slug !== "home") {
    return NextResponse.json({ error: "Yalnızca ana sayfa" }, { status: 400 });
  }

  const body = (await _req.json().catch(() => ({}))) as { publish?: boolean };
  const publish = body.publish !== false;

  const blocks = await importMirrorHomeToShopPage(auth.siteId, page.id);
  await markMirrorHomeImported(auth.siteId, publish);

  return NextResponse.json({
    ok: true,
    blockCount: blocks.length,
    published: publish,
    blocks: ensureEditorBlocks(blocks),
  });
}
