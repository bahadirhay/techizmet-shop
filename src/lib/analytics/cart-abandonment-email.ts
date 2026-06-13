import "server-only";

import { formatTry } from "@/lib/format";
import { sendTemplateEmail } from "@/lib/email/send-template-email";
import { resolveMailFrom, emailNotifications } from "@/lib/notification-settings";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

const MIN_AGE_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

type RemindResult = { scanned: number; sent: number; skipped: number; errors: number };

export type SingleRemindResult =
  | { ok: true; sent: true; email: string }
  | { ok: true; sent: false; reason: string }
  | { ok: false; error: string };

async function buildAbandonmentEmail(
  siteId: string,
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
  if (row.remindedAt && !options?.force) {
    return { ok: true, sent: false, reason: "Daha önce hatırlatma gönderildi" };
  }

  const built = await buildAbandonmentEmail(siteId, row);
  if ("error" in built && built.error) {
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
      data: { remindedAt: new Date() },
    });
    return { ok: true, sent: true, email: built.email! };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gönderim hatası" };
  }
}

export async function sendCartAbandonmentReminders(siteId: string): Promise<RemindResult> {
  const now = Date.now();
  const minActivity = new Date(now - MIN_AGE_MS);
  const maxActivity = new Date(now - MAX_AGE_MS);

  const rows = await prisma.cartAbandonment.findMany({
    where: {
      siteId,
      status: "open",
      remindedAt: null,
      OR: [{ guestEmail: { not: null } }, { customerId: { not: null } }],
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

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const result = await sendSingleCartAbandonmentReminder(siteId, row.id);
    if (!result.ok) {
      errors++;
      continue;
    }
    if (result.sent) sent++;
    else skipped++;
  }

  return { scanned: rows.length, sent, skipped, errors };
}
