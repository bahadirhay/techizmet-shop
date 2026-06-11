import { NextResponse } from "next/server";
import { sendSmtpMail, verifySmtpConnection } from "@/lib/email/smtp-send";
import { resolveSmtpConfig } from "@/lib/email/smtp-config";
import { resolveMailFrom } from "@/lib/notification-settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { getSiteSettings, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

type SmtpTestBody = {
  to?: string;
  smtpDraft?: SiteSettings["notifications"];
};

function shortSmtpDetail(detail?: string): string | undefined {
  if (!detail) return undefined;
  const first = detail.split(" — ")[0]?.trim();
  return first?.slice(0, 200) || detail.slice(0, 200);
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as SmtpTestBody;
  const to = String(body.to ?? "").trim();
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Geçerli e-posta gerekli" }, { status: 400 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const saved = parseSiteSettings(site?.settingsJson ?? null);
  let settings = saved;

  if (body.smtpDraft) {
    settings = mergeSiteSettings(saved, {
      notifications: {
        ...(body.smtpDraft.smtp
          ? { smtp: { ...body.smtpDraft.smtp, provider: "smtp" as const } }
          : {}),
        ...(body.smtpDraft.email ? { email: body.smtpDraft.email } : {}),
      },
    });
  } else {
    settings = await getSiteSettings(auth.siteId);
  }

  const smtpConfig = resolveSmtpConfig(settings);
  if (!smtpConfig?.host) {
    return NextResponse.json({
      ok: false,
      reason: "not_configured",
      message: "SMTP sunucu (host) eksik.",
    });
  }
  if (!smtpConfig.user || !smtpConfig.password) {
    return NextResponse.json({
      ok: false,
      reason: "not_configured",
      message:
        "SMTP kullanıcı adı veya şifre eksik. Şifreyi tekrar yazıp test edin (Yandex’te uygulama şifresi gerekebilir).",
    });
  }

  const siteName = site?.name ?? "Mağaza";
  const from = resolveMailFrom(settings, siteName);
  const authEmail = smtpConfig.user.trim();
  const fromEmail = from.match(/<([^>]+)>/)?.[1]?.trim() ?? from;

  if (fromEmail.toLowerCase() !== authEmail.toLowerCase()) {
    return NextResponse.json({
      ok: false,
      reason: "invalid_from",
      message: `Gönderen e-posta (${fromEmail}) SMTP kullanıcısı (${authEmail}) ile aynı olmalı. Bildirimler bölümünde gönderen adresini düzeltin.`,
    });
  }

  const verify = await verifySmtpConnection(smtpConfig);
  if (!verify.ok) {
    return NextResponse.json({
      ok: false,
      reason: "smtp_error",
      message: "SMTP bağlantısı kurulamadı.",
      detail: shortSmtpDetail(verify.detail),
      hint: verify.hint,
    });
  }

  const result = await sendSmtpMail({
    config: smtpConfig,
    from,
    to,
    subject: `[TEST] ${siteName} — SMTP bağlantı testi`,
    html: `<p>Bu mesaj <strong>${siteName}</strong> mağazasının Yandex/SMTP ayarları ile gönderildi.</p><p>Gönderen: ${from}</p>`,
    replyTo: settings.notifications?.email?.replyTo,
  });

  if (!result.sent) {
    return NextResponse.json({
      ok: false,
      reason: result.reason ?? "smtp_error",
      message: "E-posta gönderilemedi.",
      detail: shortSmtpDetail(result.detail),
      hint: result.hint,
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Test e-postası gönderildi: ${to} (gönderen: ${from})`,
  });
}
