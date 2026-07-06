import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { loadRecipesForSite } from "@/lib/stock/packaging";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const recipes = await loadRecipesForSite(auth.siteId, prisma);
  return NextResponse.json({ recipes });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    name?: string;
    outputProductId?: string;
    outputVariantId?: string;
    lines?: Array<{ stockItemId: string; qtyBasePerOutput: number; unit?: string }>;
  };

  const name = body.name?.trim();
  const outputProductId = body.outputProductId?.trim();
  if (!name || !outputProductId) {
    return NextResponse.json({ error: "Reçete adı ve çıktı ürünü zorunlu." }, { status: 400 });
  }

  const lines = (body.lines ?? []).filter((l) => l.stockItemId && l.qtyBasePerOutput > 0);
  if (!lines.length) {
    return NextResponse.json({ error: "En az bir girdi satırı gerekli." }, { status: 400 });
  }

  const recipe = await prisma.$transaction(async (tx) => {
    const created = await tx.productRecipe.create({
      data: {
        siteId: auth.siteId,
        name,
        outputProductId,
        outputVariantId: body.outputVariantId?.trim() || null,
      },
    });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const item = await tx.stockItem.findFirst({
        where: { id: line.stockItemId, siteId: auth.siteId },
      });
      if (!item) throw new Error("Stok kartı bulunamadı.");

      let qtyBase = Math.trunc(line.qtyBasePerOutput);
      if (item.unit === "kg" && line.unit === "kg") {
        qtyBase = Math.round(line.qtyBasePerOutput * 1000);
      }

      await tx.productRecipeLine.create({
        data: {
          recipeId: created.id,
          stockItemId: item.id,
          qtyBasePerOutput: qtyBase,
          sortOrder: i,
        },
      });
    }

    return created;
  });

  return NextResponse.json({ recipe });
}
