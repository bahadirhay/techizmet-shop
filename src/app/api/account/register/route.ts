import { NextResponse } from "next/server";
import {
  hashCustomerPassword,
  setCustomerSession,
} from "@/lib/customer-auth";
import { canSetPasswordOnCustomer } from "@/lib/customer-oauth";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`register:${clientIp(req)}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);
  const body = (await req.json()) as Record<string, string>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const b2bApplication = body.b2bApplication === "true" || body.b2bApplication === "1";
  const companyName = String(body.companyName ?? "").trim();
  const taxId = String(body.taxId ?? "").trim();
  const taxOffice = String(body.taxOffice ?? "").trim();
  const b2bApplicationNote = String(body.b2bApplicationNote ?? "").trim();

  if (!email || password.length < 6) {
    return NextResponse.json({ error: "E-posta ve en az 6 karakterli şifre gerekli" }, { status: 400 });
  }
  if (b2bApplication && !companyName) {
    return NextResponse.json({ error: "B2B başvurusu için firma ünvanı gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const existing = await prisma.storeCustomer.findFirst({
    where: { siteId: site.id, email },
  });

  const hash = await hashCustomerPassword(password);

  if (existing && !canSetPasswordOnCustomer(existing)) {
    return NextResponse.json(
      {
        error: existing.passwordHash
          ? "Bu e-posta zaten kayıtlı. Giriş yapın."
          : "Bu e-posta Google veya Apple ile kayıtlı. Sosyal giriş kullanın.",
      },
      { status: 400 },
    );
  }

  const customer = existing
    ? await prisma.storeCustomer.update({
        where: { id: existing.id },
        data: {
          passwordHash: hash,
          firstName,
          lastName,
          phone: phone || existing.phone,
          ...(b2bApplication && existing.b2bStatus !== "approved"
            ? {
                b2bStatus: "pending",
                companyName,
                b2bAppliedAt: new Date(),
                b2bApplicationNote: b2bApplicationNote || null,
                ...(taxId ? { taxId } : {}),
                ...(taxOffice ? { taxOffice } : {}),
              }
            : {}),
        },
      })
    : await prisma.storeCustomer.create({
        data: {
          siteId: site.id,
          email,
          passwordHash: hash,
          firstName,
          lastName,
          phone: phone || null,
          ...(b2bApplication
            ? {
                b2bStatus: "pending",
                companyName,
                b2bAppliedAt: new Date(),
                b2bApplicationNote: b2bApplicationNote || null,
                taxId: taxId || null,
                taxOffice: taxOffice || null,
              }
            : {}),
        },
      });

  await setCustomerSession(customer.id, email, site.id);
  return NextResponse.json({
    ok: true,
    b2bPending: b2bApplication && customer.b2bStatus === "pending",
  });
}
