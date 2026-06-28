import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export type InvoiceLineSuggestion = {
  kind: "template" | "product";
  id: string;
  description: string;
  unit: string;
  unitPriceTl: number;
  vatRate: number;
};

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    // Boş sorguda kayıtlı kalemlerin tamamını döndür
    const templates = await prisma.financeInvoiceLineTemplate.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 20,
    });
    return NextResponse.json({
      suggestions: templates.map((t) => ({
        kind: "template" as const,
        id: t.id,
        description: t.description,
        unit: t.unit,
        unitPriceTl: Number(t.unitPriceTl),
        vatRate: t.vatRate,
      })),
    });
  }

  const [templates, products] = await Promise.all([
    prisma.financeInvoiceLineTemplate.findMany({
      where: {
        siteId: auth.siteId,
        active: true,
        description: { contains: q, mode: "insensitive" },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 6,
    }),
    prisma.storeProduct.findMany({
      where: {
        siteId: auth.siteId,
        published: true,
        title: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        priceMinor: true,
        vatRate: true,
      },
      take: 6,
      orderBy: { title: "asc" },
    }),
  ]);

  const suggestions: InvoiceLineSuggestion[] = [
    ...templates.map((t) => ({
      kind: "template" as const,
      id: t.id,
      description: t.description,
      unit: t.unit,
      unitPriceTl: Number(t.unitPriceTl),
      vatRate: t.vatRate,
    })),
    ...products.map((p) => ({
      kind: "product" as const,
      id: p.id,
      description: p.title,
      unit: "adet",
      unitPriceTl: p.priceMinor / 100,
      vatRate: p.vatRate ?? 20,
    })),
  ];

  return NextResponse.json({ suggestions });
}
