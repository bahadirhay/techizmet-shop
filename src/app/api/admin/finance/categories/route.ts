import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const categories = await prisma.financeCategory.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as { name?: string; kind?: string };
  const name = body.name?.trim();
  const kind = body.kind === "expense" ? "expense" : "income";
  if (!name) return NextResponse.json({ error: "Kategori adı gerekli." }, { status: 400 });
  const max = await prisma.financeCategory.aggregate({
    where: { siteId: auth.siteId, kind },
    _max: { sortOrder: true },
  });
  const category = await prisma.financeCategory.upsert({
    where: { siteId_kind_name: { siteId: auth.siteId, kind, name } },
    create: {
      siteId: auth.siteId,
      kind,
      name,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
    update: { active: true },
  });
  return NextResponse.json({ category });
}
