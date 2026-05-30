import { NextResponse } from "next/server";
import { listCategoryMappings, upsertCategoryMapping } from "@/lib/marketplace/category-mapping";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const platform = new URL(req.url).searchParams.get("platform")?.trim().toLowerCase() ?? "";
  if (!platform) return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });

  const mappings = await listCategoryMappings(auth.siteId, platform);
  return NextResponse.json({ mappings });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    platform?: string;
    categoryId?: string | null;
    platformCategoryId?: string;
    platformBrandId?: string | null;
  };

  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!platform || !body.platformCategoryId?.trim()) {
    return NextResponse.json({ error: "Platform ve pazaryeri kategori ID gerekli" }, { status: 400 });
  }

  const mapping = await upsertCategoryMapping({
    siteId: auth.siteId,
    platform,
    categoryId: body.categoryId ?? null,
    platformCategoryId: body.platformCategoryId,
    platformBrandId: body.platformBrandId ?? null,
  });

  return NextResponse.json({ mapping });
}
