import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/account/require-customer";
import { prisma } from "@/lib/prisma";

function parseAddressBody(body: Record<string, unknown>) {
  return {
    label: String(body.label ?? "").trim() || null,
    firstName: String(body.firstName ?? "").trim() || null,
    lastName: String(body.lastName ?? "").trim() || null,
    phone: String(body.phone ?? "").trim() || null,
    city: String(body.city ?? "").trim(),
    district: String(body.district ?? "").trim(),
    line1: String(body.line1 ?? "").trim(),
    postalCode: String(body.postalCode ?? "").trim() || null,
    isDefault: Boolean(body.isDefault),
  };
}

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: auth.customer.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ addresses });
}

export async function POST(req: Request) {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const data = parseAddressBody((await req.json()) as Record<string, unknown>);
  if (!data.city || !data.district || !data.line1) {
    return NextResponse.json({ error: "İl, ilçe ve adres zorunlu" }, { status: 400 });
  }

  if (data.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId: auth.customer.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: { customerId: auth.customer.id, ...data },
  });
  return NextResponse.json({ address });
}
