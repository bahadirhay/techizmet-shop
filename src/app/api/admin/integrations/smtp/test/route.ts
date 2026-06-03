import { NextResponse } from "next/server";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { resolveMailFrom } from "@/lib/notification-settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { getSiteSettings, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { to?: string; smtpDraft?: SiteSettings["notifications"] };
  const to = String(body.to ?? "").trim();
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Geçerli e-posta gerekli" }, { status: 400 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const saved = parseSiteSettings(site?.settingsJson ?? null);
  let settings = saved;

  if (body.smtpDraft?.smtp) {
    settings = mergeSiteSettings(saved, {
      notifications: {
        smtp: body.smtpDraft.smtp,
      },
    });
  } else {
    settings = await getSiteSettings(auth.siteId);
  }

  const siteName = site?.name ?? "Mağaza";
  const result = await sendTemplateEmail({
    to,
    subject: `[TEST] ${siteName} — SMTP bağlantı testi`,
    html: `<p>Bu mesaj <strong>${siteName}</strong> mağazasının e-posta sunucu ayarları ile gönderildi.</p>`,
    from: resolveMailFrom(settings, siteName),
    replyTo: settings.notifications?.email?.replyTo,
    settings,
  });

  if (!result.sent) {
    const reasonMsg =
      result.reason === "not_configured"
        ? "SMTP veya Resend yapılandırılmamış — sunucu bilgilerini girin ve kaydedin."
        : result.reason === "smtp_error"
          ? "SMTP sunucusu reddetti — host, port, kullanıcı ve şifreyi kontrol edin."
          : result.reason === "api_error"
            ? "Resend API hatası — API anahtarını kontrol edin."
            : "E-posta gönderilemedi";
    return NextResponse.json({
      ok: false,
      reason: result.reason ?? "not_configured",
      message: reasonMsg,
    });
  }

  return NextResponse.json({ ok: true, message: `Test e-postası gönderildi: ${to}` });
}
