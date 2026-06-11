import { NextResponse } from "next/server";
import { optimizeProductSeo } from "@/lib/admin/product-seo/optimizer";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    description?: string;
    categoryIds?: string[];
    categoryId?: string;
    brandId?: string;
    productId?: string;
    weightGrams?: number;
    pieceCount?: number;
  };

  const title = body.title?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "Ürün adı gerekli" }, { status: 400 });
  }

  const categoryIds = [
    ...(body.categoryIds ?? []),
    ...(body.categoryId ? [body.categoryId] : []),
  ].filter(Boolean);

  const result = await optimizeProductSeo(auth.siteId, {
    title,
    slug: body.slug,
    description: body.description,
    categoryIds: [...new Set(categoryIds)],
    brandId: body.brandId,
    productId: body.productId,
    weightGrams: typeof body.weightGrams === "number" && body.weightGrams > 0
      ? body.weightGrams
      : undefined,
    pieceCount: typeof body.pieceCount === "number" && body.pieceCount > 0
      ? body.pieceCount
      : undefined,
  });

  return NextResponse.json({ result });
}
