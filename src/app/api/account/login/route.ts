import { NextResponse } from "next/server";
import { setCustomerSession, verifyCustomerPassword } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "E-posta ve şifre gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const customer = await prisma.storeCustomer.findFirst({
    where: { siteId: site.id, email },
  });

  if (!customer?.passwordHash) {
    return NextResponse.json({ error: "Hesap bulunamadı veya şifre atanmamış" }, { status: 401 });
  }

  const ok = await verifyCustomerPassword(password, customer.passwordHash);
  if (!ok) return NextResponse.json({ error: "Şifre hatalı" }, { status: 401 });

  await setCustomerSession(customer.id, email, site.id);
  return NextResponse.json({ ok: true });
}
