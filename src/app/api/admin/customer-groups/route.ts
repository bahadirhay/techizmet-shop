import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "grup";
}

export async function GET() {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;

  const groups = await prisma.customerGroup.findMany({
    where: { siteId: auth.siteId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Grup adı gerekli" }, { status: 400 });

  const discountPercent = Math.min(99, Math.max(0, parseInt(String(body.discountPercent ?? 0), 10) || 0));
  const slug = String(body.slug ?? "").trim() || slugify(name);

  const group = await prisma.customerGroup.create({
    data: {
      siteId: auth.siteId,
      name,
      slug,
      discountPercent,
      active: body.active !== false,
      description: String(body.description ?? "").trim() || null,
      orderNumberPrefix: String(body.orderNumberPrefix ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || null,
    },
  });
  return NextResponse.json({ group });
}
