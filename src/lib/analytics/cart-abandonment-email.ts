import "server-only";

import { formatTry } from "@/lib/format";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { resolveMailFrom, emailNotifications } from "@/lib/notification-settings";
import { issueUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

type Stage = 1 | 2 | 3;

/** Aşama başına [min, max] saat penceresi — lastActivityAt'tan bu kadar süre geçince sırası gelir */
const STAGE_WINDOWS_HOURS: Record<Stage, { min: number; max: number }> = {
  1: { min: 1, max: 6 },
  2: { min: 20, max: 28 },
  3: { min: 60, max: 80 },
};

type RemindResult = { scanned: number; sent: number; skipped: number; errors: number };

export type SingleRemindResult =
  | { ok: true; sent: true; email: string }
  | { ok: true; sent: false; reason: string }
  | { ok: false; error: string };

async function buildAbandonmentEmail(
  siteId: string,
  stage: Stage,
  row: {
    itemsJson: string;
    cartValueMinor: number;
    guestEmail?: string | null;
    visitor: { customer: { email: string | null; firstName: string | null } | null };
    customerId: string | null;
  },
) {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { name: true } });
  const settings = await getSiteSettings(siteId);
  const mail = emailNotifications(settings);
  const storeUrl = (process.env.NEXT_PUBLIC_STORE_URL ?? "").replace(/\/$/, "");
  const from = resolveMailFrom(settings, site?.name ?? "Mağaza");
  const storeName = site?.name ?? "Mağaza";

  let email = row.guestEmail?.trim() || row.visitor.customer?.email?.trim();
  let firstName = row.visitor.customer?.firstName?.trim();
  if ((!email || !firstName) && row.customerId) {
    const c = await prisma.storeCustomer.findUnique({
      where: { id: row.customerId },
      select: { email: true, firstName: true },
    });
    email = email || c?.email?.trim();
    firstName = firstName || c?.firstName?.trim();
  }

  if (!email) return { mail, from, settings, error: "E-posta yok" as const };
  if (!mail.enabled) return { mail, from, settings, error: "E-posta bildirimleri kapalı" as const };

  const suppressed = await prisma.emailSuppression.findUnique({
    where: { siteId_email: { siteId, email } },
  });
  if (suppressed) return { mail, from, settings, error: "Abonelikten çıkmış" as const };

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
  const discountCode = settings.marketing?.abandonedCart?.discountCode?.trim();
  const unsubscribeUrl = `${storeUrl}/unsubscribe?token=${encodeURIComponent(
    issueUnsubscribeToken(siteId, email),
  )}`;

  const discountBlockHtml = discountCode
    ? `<p style="margin-top:12px"><strong>${discountCode}</strong> kodunu kullanarak indirimden yararlanabilirsiniz.</p>`
    : "";

  let subject: string;
  let intro: string;
  if (stage === 1) {
    subject = `${storeName} — sepetiniz sizi bekliyor`;
    intro = "Sepetinize eklediğiniz ürünler hâlâ sizi bekliyor.";
  } else if (stage === 2) {
    subject = discountCode
      ? `${storeName} — sepetinizde size özel indirim var`
      : `${storeName} — sepetiniz hâlâ duruyor`;
    intro = "Sepetinizdeki ürünleri tamamlamayı unutmayın.";
  } else {
    subject = `${storeName} — son hatırlatma: sepetiniz`;
    intro = "Bu, sepetinizle ilgili son hatırlatmamız.";
  }

  const html = `<p>${greeting},</p>
<p>${intro}</p>
<p>${lines || "Sepetinizde ürünler var."}</p>
<p><strong>Toplam:</strong> ${formatTry(row.cartValueMinor)}</p>
${discountBlockHtml}
<p><a href="${storeUrl}/cart">Sepete dön</a></p>
<p style="color:#666;font-size:12px">Bu tür e-postaları almak istemiyorsanız <a href="${unsubscribeUrl}">abonelikten çıkabilirsiniz</a>.</p>`;

  return { mail, from, settings, email, subject, html };
}

export async function sendSingleCartAbandonmentReminder(
  siteId: string,
  abandonmentId: string,
  options?: { force?: boolean },
): Promise<SingleRemindResult> {
  const row = await prisma.cartAbandonment.findFirst({
    where: { id: abandonmentId, siteId, status: "open" },
    include: {
      visitor: { select: { customer: { select: { email: true, firstName: true } } } },
    },
  });
  if (!row) return { ok: false, error: "Sepet terki bulunamadı" };
  if (row.reminderStage >= 3 && !options?.force) {
    return { ok: true, sent: false, reason: "Hatırlatma dizisi tamamlandı" };
  }

  const targetStage = Math.min(row.reminderStage + 1, 3) as Stage;
  const built = await buildAbandonmentEmail(siteId, targetStage, row);
  if ("error" in built && built.error) {
    if (built.error === "Abonelikten çıkmış") {
      await prisma.cartAbandonment.update({ where: { id: row.id }, data: { reminderStage: 3 } });
    }
    return { ok: true, sent: false, reason: built.error };
  }

  try {
    const result = await sendTemplateEmail({
      to: built.email!,
      subject: built.subject!,
      html: built.html!,
      from: built.from,
      replyTo: built.mail.replyTo,
      settings: built.settings,
    });
    if (!result.sent) return { ok: true, sent: false, reason: "E-posta gönderilemedi" };
    await prisma.cartAbandonment.update({
      where: { id: row.id },
      data: { remindedAt: new Date(), reminderStage: targetStage },
    });
    return { ok: true, sent: true, email: built.email! };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gönderim hatası" };
  }
}

export async function sendCartAbandonmentReminders(siteId: string): Promise<RemindResult> {
  const settings = await getSiteSettings(siteId);
  if (!settings.marketing?.abandonedCart?.enabled) {
    return { scanned: 0, sent: 0, skipped: 0, errors: 0 };
  }

  const now = Date.now();
  const oldestBound = new Date(now - STAGE_WINDOWS_HOURS[3].max * 60 * 60 * 1000);
  const newestBound = new Date(now - STAGE_WINDOWS_HOURS[1].min * 60 * 60 * 1000);

  const rows = await prisma.cartAbandonment.findMany({
    where: {
      siteId,
      status: "open",
      reminderStage: { lt: 3 },
      OR: [{ guestEmail: { not: null } }, { customerId: { not: null } }],
      lastActivityAt: { lte: newestBound, gte: oldestBound },
    },
    include: {
      visitor: {
        select: {
          customer: { select: { email: true, firstName: true } },
        },
      },
    },
    take: 60,
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let due = 0;

  for (const row of rows) {
    const targetStage = (row.reminderStage + 1) as Stage;
    const window = STAGE_WINDOWS_HOURS[targetStage];
    const hoursSince = (now - row.lastActivityAt.getTime()) / (60 * 60 * 1000);
    if (hoursSince < window.min || hoursSince > window.max) continue;
    due++;

    const result = await sendSingleCartAbandonmentReminder(siteId, row.id);
    if (!result.ok) {
      errors++;
      continue;
    }
    if (result.sent) sent++;
    else skipped++;
  }

  return { scanned: due, sent, skipped, errors };
}
