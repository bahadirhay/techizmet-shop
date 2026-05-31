import { NextResponse } from "next/server";
import { buildOrderEmailVars } from "@/lib/email/build-order-vars";
import { renderEmailTemplate, resolveEmailTemplate } from "@/lib/email/template-render";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { requireStaffApi } from "@/lib/staff-auth";
import { getSiteSettings, type EmailTemplateKey } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

const KEYS: EmailTemplateKey[] = ["orderConfirmation", "orderShipped", "orderCancelled"];

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { templateKey?: string; to?: string };
  const templateKey = body.templateKey as EmailTemplateKey;
  const to = String(body.to ?? "").trim();

  if (!KEYS.includes(templateKey)) {
    return NextResponse.json({ error: "Geçersiz şablon" }, { status: 400 });
  }
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Geçerli e-posta gerekli" }, { status: 400 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = await getSiteSettings(auth.siteId);
  const template = resolveEmailTemplate(templateKey, settings.email?.templates);

  const vars = buildOrderEmailVars({
    customerName: "Test Müşteri",
    orderNumber: "KN-TEST-0001",
    totalMinor: 125000,
    paymentMethod: "cod",
    storeName: site?.name ?? "Mağaza",
    trackingNumber: "HB123456789",
    status: templateKey === "orderCancelled" ? "cancelled" : "shipped",
    lines: [
      { title: "Örnek Ürün A", qty: 2, lineMinor: 50000 },
      { title: "Örnek Ürün B", qty: 1, lineMinor: 25000 },
    ],
  });

  const { subject, html } = renderEmailTemplate(template, vars);
  const result = await sendTemplateEmail({ to, subject: `[TEST] ${subject}`, html });

  if (!result.sent) {
    const reasonMsg =
      result.reason === "not_configured"
        ? "SMTP veya RESEND yapılandırılmamış — .env dosyasında SMTP_HOST veya RESEND_API_KEY tanımlayın."
        : result.reason === "smtp_error"
          ? "SMTP sunucusu reddetti — host, port ve şifreyi kontrol edin."
          : "E-posta gönderilemedi";
    return NextResponse.json({
      ok: false,
      reason: result.reason ?? "not_configured",
      message: reasonMsg,
    });
  }

  return NextResponse.json({ ok: true, message: `Test e-postası gönderildi: ${to}` });
}
