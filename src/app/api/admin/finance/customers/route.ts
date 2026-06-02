import { NextResponse } from "next/server";
import { hashCustomerPassword } from "@/lib/customer-auth";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    type?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    notes?: string;
  };
  const type = body.type === "member" ? "member" : "guest";
  const email = body.email?.trim().toLowerCase() || null;
  if (!email) {
    return NextResponse.json({ error: "E-posta zorunlu." }, { status: 400 });
  }
  const existing = await prisma.storeCustomer.findFirst({
    where: { siteId: auth.siteId, email },
    select: { id: true, passwordHash: true },
  });

  if (existing && type === "member" && existing.passwordHash) {
    return NextResponse.json({ error: "Bu e-posta zaten üye." }, { status: 400 });
  }

  const passwordHash =
    type === "member"
      ? await hashCustomerPassword(String(body.password ?? "").trim())
      : null;
  if (type === "member" && !passwordHash) {
    return NextResponse.json({ error: "Üye için şifre zorunlu." }, { status: 400 });
  }

  const customer = existing
    ? await prisma.storeCustomer.update({
        where: { id: existing.id },
        data: {
          firstName: body.firstName?.trim() || null,
          lastName: body.lastName?.trim() || null,
          phone: body.phone?.trim() || null,
          notes: body.notes?.trim() || null,
          passwordHash: passwordHash || undefined,
        },
      })
    : await prisma.storeCustomer.create({
        data: {
          siteId: auth.siteId,
          firstName: body.firstName?.trim() || null,
          lastName: body.lastName?.trim() || null,
          email,
          phone: body.phone?.trim() || null,
          notes: body.notes?.trim() || null,
          passwordHash,
        },
      });

  return NextResponse.json({ customer });
}
