import { NextResponse } from "next/server";
import {
  fetchInstagramOembed,
  instagramOembedToPostPatch,
  normalizeInstagramPermalink,
} from "@/lib/instagram-url";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const posts = await prisma.storeInstagramPost.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as { permalink?: string };
  const permalink = normalizeInstagramPermalink(body.permalink ?? "");
  if (!permalink) {
    return NextResponse.json({ error: "Geçerli bir Instagram bağlantısı girin" }, { status: 400 });
  }
  const agg = await prisma.storeInstagramPost.aggregate({
    where: { siteId: auth.siteId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const oembed = await fetchInstagramOembed(permalink);
  const meta = instagramOembedToPostPatch(permalink, oembed);

  try {
    const row = await prisma.storeInstagramPost.create({
      data: {
        siteId: auth.siteId,
        permalink,
        published: false,
        sortOrder,
        source: "manual",
        ...meta,
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Bu gönderi zaten listede" }, { status: 409 });
  }
}
