import "server-only";

import { formatTry } from "@/lib/format";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { resolveMailFrom, emailNotifications } from "@/lib/notification-settings";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

const MIN_AGE_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

type RemindResult = { scanned: number; sent: number; skipped: number; errors: number };

export async function sendCartAbandonmentReminders(siteId: string): Promise<RemindResult> {
  const now = Date.now();
  const minActivity = new Date(now - MIN_AGE_MS);
  const maxActivity = new Date(now - MAX_AGE_MS);

  const rows = await prisma.cartAbandonment.findMany({
    where: {
      siteId,
      status: "open",
      remindedAt: null,
      customerId: { not: null },
      lastActivityAt: { lte: minActivity, gte: maxActivity },
    },
    include: {
      visitor: {
        select: {
          customer: { select: { email: true, firstName: true } },
        },
      },
    },
    take: 40,
  });

  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { name: true } });
  const settings = await getSiteSettings(siteId);
  const mail = emailNotifications(settings);
  const storeUrl = (process.env.NEXT_PUBLIC_STORE_URL ?? "").replace(/\/$/, "");
  const from = resolveMailFrom(settings, site?.name ?? "Mağaza");

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    let email = row.visitor.customer?.email?.trim();
    let firstName = row.visitor.customer?.firstName?.trim();
    if ((!email || !firstName) && row.customerId) {
      const c = await prisma.storeCustomer.findUnique({
        where: { id: row.customerId },
        select: { email: true, firstName: true },
      });
      email = email || c?.email?.trim();
      firstName = firstName || c?.firstName?.trim();
    }
    if (!email || !mail.enabled) {
      skipped++;
      continue;
    }

    let items: { title?: string; slug?: string; qty: number }[] = [];
    try {
      items = JSON.parse(row.itemsJson) as { title?: string; slug?: string; qty: number }[];
    } catch {
      items = [];
    }

    const lines = items
      .slice(0, 5)
      .map((i) => `• ${i.title ?? "Ürün"}${i.qty > 1 ? ` ×${i.qty}` : ""}`)
      .join("<br/>");

    const greeting = firstName || "Merhaba";
    const subject = `${site?.name ?? "Mağaza"} — sepetiniz sizi bekliyor`;
    const html = `<p>${greeting},</p>
<p>Sepetinize eklediğiniz ürünler hâlâ sizi bekliyor.</p>
<p>${lines || "Sepetinizde ürünler var."}</p>
<p><strong>Toplam:</strong> ${formatTry(row.cartValueMinor)}</p>
<p><a href="${storeUrl}/cart">Sepete dön</a></p>
<p style="color:#666;font-size:12px">Bu e-postayı almak istemiyorsanız mağaza ile iletişime geçebilirsiniz.</p>`;

    try {
      const result = await sendTemplateEmail({
        to: email,
        subject,
        html,
        from,
        replyTo: mail.replyTo,
        settings,
      });
      if (result.sent) {
        await prisma.cartAbandonment.update({
          where: { id: row.id },
          data: { remindedAt: new Date() },
        });
        sent++;
      } else {
        skipped++;
      }
    } catch {
      errors++;
    }
  }

  return { scanned: rows.length, sent, skipped, errors };
}
