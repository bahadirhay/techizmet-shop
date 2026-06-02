import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const templates = await prisma.financePostingTemplate.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ active: "desc" }, { priority: "asc" }],
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as {
    name?: string;
    keyword?: string;
    direction?: string;
    source?: string;
    categoryId?: string;
    accountId?: string;
    priority?: number;
  };
  const name = body.name?.trim();
  const keyword = body.keyword?.trim();
  if (!name || !keyword || !body.categoryId || !body.accountId) {
    return NextResponse.json({ error: "Ad, anahtar kelime, kategori ve hesap zorunlu." }, { status: 400 });
  }
  const row = await prisma.financePostingTemplate.create({
    data: {
      siteId: auth.siteId,
      name,
      keyword,
      direction: body.direction?.trim() || null,
      source: body.source?.trim() || null,
      categoryId: body.categoryId,
      accountId: body.accountId,
      priority: Number.isFinite(body.priority) ? Number(body.priority) : 100,
    },
  });
  return NextResponse.json({ template: row });
}
