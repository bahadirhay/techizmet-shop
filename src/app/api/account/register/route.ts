import { NextResponse } from "next/server";
import {
  hashCustomerPassword,
  setCustomerSession,
} from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, string>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!email || password.length < 6) {
    return NextResponse.json({ error: "E-posta ve en az 6 karakterli şifre gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const existing = await prisma.storeCustomer.findFirst({
    where: { siteId: site.id, email },
  });

  const hash = await hashCustomerPassword(password);

  if (existing?.passwordHash) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı. Giriş yapın." }, { status: 400 });
  }

  const customer = existing
    ? await prisma.storeCustomer.update({
        where: { id: existing.id },
        data: { passwordHash: hash, firstName, lastName, phone: phone || existing.phone },
      })
    : await prisma.storeCustomer.create({
        data: {
          siteId: site.id,
          email,
          passwordHash: hash,
          firstName,
          lastName,
          phone: phone || null,
        },
      });

  await setCustomerSession(customer.id, email, site.id);
  return NextResponse.json({ ok: true });
}
