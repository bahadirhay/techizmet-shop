import { NextResponse } from "next/server";
import {
  hashCustomerPassword,
  setCustomerSession,
} from "@/lib/customer-auth";
import { canSetPasswordOnCustomer } from "@/lib/customer-oauth";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings, getSiteSeo } from "@/lib/site-settings";
import { emailDomainLooksReachable, validateEmailFormat } from "@/lib/validation/email";
import { validatePersonName } from "@/lib/validation/person-name";

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`register:${clientIp(req)}`, 8, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);
  const body = (await req.json()) as Record<string, string>;

  const emailCheck = validateEmailFormat(String(body.email ?? ""));
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }
  const email = emailCheck.email;

  const reachable = await emailDomainLooksReachable(email);
  if (!reachable) {
    return NextResponse.json(
      { error: "E-posta alan adı doğrulanamadı. Geçerli bir adres kullanın." },
      { status: 400 },
    );
  }

  const nameCheck = validatePersonName({
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    requireFirstName: true,
    requireLastName: false,
  });
  if (!nameCheck.ok) {
    return NextResponse.json({ error: nameCheck.error }, { status: 400 });
  }
  const { firstName, lastName } = nameCheck;

  const password = String(body.password ?? "");
  const phone = String(body.phone ?? "").trim();
  const b2bApplication = body.b2bApplication === "true" || body.b2bApplication === "1";
  const companyName = String(body.companyName ?? "").trim();
  const taxId = String(body.taxId ?? "").trim();
  const taxOffice = String(body.taxOffice ?? "").trim();
  const b2bApplicationNote = String(body.b2bApplicationNote ?? "").trim();

  if (password.length < 6) {
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

  const wasGuestWithoutPassword = Boolean(existing && !existing.passwordHash);
  const isNewMembership = !existing || wasGuestWithoutPassword;

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

  let boxGrant: {
    code: string;
    percentOff: number;
    expiresAt: string;
    alreadyHad: boolean;
  } | null = null;
  const source = String(body.source ?? "").trim();
  if (source === "box_qr" && !existing) {
    try {
      const { grantBoxQrReward } = await import("@/lib/box-qr/grant");
      const grant = await grantBoxQrReward(site.id, customer.id);
      if (grant.ok) {
        boxGrant = {
          code: grant.code,
          percentOff: grant.percentOff,
          expiresAt: grant.expiresAt,
          alreadyHad: grant.alreadyHad,
        };
      }
    } catch (e) {
      console.error("[box-qr] register grant", e);
    }
  }

  if (isNewMembership) {
    void (async () => {
      try {
        const settings = await getSiteSettings(site.id);
        const siteName = getSiteSeo(settings, site.name).siteTitle;
        const { notifyTelegramNewMember } = await import("@/lib/telegram/order-telegram-notify");
        await notifyTelegramNewMember(settings, siteName, {
          id: customer.id,
          email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          source: source || "register",
          b2bPending: b2bApplication && customer.b2bStatus === "pending",
        });
      } catch (e) {
        console.error("[telegram] new member", e);
      }
    })();
  }

  return NextResponse.json({
    ok: true,
    b2bPending: b2bApplication && customer.b2bStatus === "pending",
    ...(boxGrant ? { boxGrant } : {}),
  });
}
