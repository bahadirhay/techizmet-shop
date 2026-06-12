import { NextResponse } from "next/server";
import {
  buildCustomerResetUrl,
  sendCustomerPasswordResetEmail,
} from "@/lib/email/send-password-reset-email";
import { issueCustomerPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

const GENERIC_OK = {
  ok: true,
  message: "Kayıtlı e-posta adresiniz varsa sıfırlama bağlantısı gönderildi.",
};

export async function POST(req: Request) {
  const rl = checkRateLimit(`forgot-pw:${clientIp(req)}`, 6, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);
  const body = (await req.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const customer = await prisma.storeCustomer.findFirst({
    where: { siteId: site.id, email, passwordHash: { not: null } },
    select: { id: true, email: true },
  });

  if (!customer?.email) {
    return NextResponse.json(GENERIC_OK);
  }

  const settings = await getSiteSettings(site.id);
  const { raw } = await issueCustomerPasswordResetToken(site.id, customer.id);
  const resetUrl = buildCustomerResetUrl(raw);

  const mail = await sendCustomerPasswordResetEmail({
    to: customer.email,
    resetUrl,
    siteName: site.name,
    settings,
  });

  if (!mail.sent && process.env.NODE_ENV === "production") {
    console.warn("[forgot-password] mail not sent:", mail.reason, customer.email);
  }

  return NextResponse.json({
    ...GENERIC_OK,
    mailSent: mail.sent,
    ...(process.env.NODE_ENV === "development" && !mail.sent ? { devResetUrl: resetUrl } : {}),
  });
}
