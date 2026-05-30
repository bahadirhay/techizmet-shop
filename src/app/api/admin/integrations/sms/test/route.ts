import { NextResponse } from "next/server";
import { smsNotifications } from "@/lib/notification-settings";
import { renderSmsBody, sendSms } from "@/lib/sms/send-sms";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { to?: string };
  const to = body.to?.trim();
  if (!to) return NextResponse.json({ error: "to gerekli" }, { status: 400 });

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const sms = smsNotifications(settings);

  const message = renderSmsBody(sms.defaultBody, {
    storeName: site?.name ?? "Mağaza",
    orderNumber: "TEST-001",
    total: "₺0,00",
    storeUrl: process.env.NEXT_PUBLIC_STORE_URL ?? "",
  });

  const result = await sendSms({ to, message, config: sms });

  if (result.sent) {
    return NextResponse.json({ ok: true, message: "Test SMS gönderildi." });
  }
  if (result.reason === "not_configured") {
    return NextResponse.json({
      ok: false,
      message:
        "Netgsm bilgileri eksik veya RESEND benzeri yapılandırma yok. Ayarları kaydedin; geliştirmede konsola log yazılır.",
      reason: result.reason,
    });
  }
  return NextResponse.json(
    { error: result.reason ?? "SMS gönderilemedi" },
    { status: 400 },
  );
}
