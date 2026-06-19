import { NextResponse } from "next/server";
import { storeHomePreset } from "@/lib/blocks/presets/techizmet-shop-home";
import { serializeBlocks } from "@/lib/blocks/schema";
import { slugify } from "@/lib/admin/slug";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { notifyPublishedCmsPage } from "@/lib/seo/publish-notify";

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const slug = slugify(String(body.slug ?? title));
  const usePreset = Boolean(body.useStoreHomePreset);

  const page = await prisma.shopPage.create({
    data: {
      siteId: auth.siteId,
      title,
      slug,
      blocks: usePreset ? serializeBlocks(storeHomePreset) : "[]",
      published: body.published !== false,
      seoTitle: String(body.seoTitle ?? "").trim() || null,
      seoDescription: String(body.seoDescription ?? "").trim() || null,
    },
  });
  if (page.published) {
    notifyPublishedCmsPage(page.slug);
  }
  return NextResponse.json({ page });
}
