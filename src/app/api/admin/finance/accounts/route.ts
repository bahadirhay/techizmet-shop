import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const accounts = await prisma.financeAccount.findMany({
    where: { siteId: auth.siteId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as { name?: string; kind?: string; platform?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Hesap adı gerekli." }, { status: 400 });
  const kindSet = new Set(["cash", "bank", "credit_card", "marketplace_receivable"]);
  const kind = kindSet.has(String(body.kind)) ? String(body.kind) : "bank";
  const account = await prisma.financeAccount.upsert({
    where: { siteId_name: { siteId: auth.siteId, name } },
    create: {
      siteId: auth.siteId,
      name,
      kind,
      platform: body.platform?.trim() || null,
    },
    update: { active: true, kind, platform: body.platform?.trim() || null },
  });
  return NextResponse.json({ account });
}
