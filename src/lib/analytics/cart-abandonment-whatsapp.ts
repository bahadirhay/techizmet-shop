import "server-only";

import { formatTry } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function buildWaMeUrl(digits: string, text: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type WhatsappRemindResult =
  | { ok: true; waUrl: string; phone: string }
  | { ok: false; error: string };

export async function buildCartAbandonmentWhatsappUrl(
  siteId: string,
  abandonmentId: string,
): Promise<WhatsappRemindResult> {
  const row = await prisma.cartAbandonment.findFirst({
    where: { id: abandonmentId, siteId, status: "open" },
    include: {
      visitor: {
        select: {
          customer: { select: { email: true, firstName: true, phone: true } },
        },
      },
    },
  });
  if (!row) return { ok: false, error: "Sepet terki bulunamadı" };

  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { name: true } });

  let customerPhone = row.guestPhone?.trim() || row.visitor.customer?.phone?.trim() || null;
  if (!customerPhone && row.customerId) {
    const c = await prisma.storeCustomer.findUnique({
      where: { id: row.customerId },
      select: { phone: true, firstName: true },
    });
    customerPhone = c?.phone?.trim() ?? null;
  }

  if (!customerPhone) {
    return { ok: false, error: "Müşteri telefonu yok — checkout veya üye kaydında telefon gerekir" };
  }

  let items: { title?: string; qty: number }[] = [];
  try {
    items = JSON.parse(row.itemsJson) as { title?: string; qty: number }[];
  } catch {
    items = [];
  }

  const lines = items
    .slice(0, 4)
    .map((i) => `• ${i.title ?? "Ürün"}${i.qty > 1 ? ` ×${i.qty}` : ""}`)
    .join("\n");

  const storeUrl = (process.env.NEXT_PUBLIC_STORE_URL ?? "").replace(/\/$/, "");
  const firstName = row.visitor.customer?.firstName?.trim();
  const greeting = firstName ? `Merhaba ${firstName}` : "Merhaba";

  const text = [
    greeting,
    "",
    `${site?.name ?? "Mağazamız"} sepetinizde ürünlerinizi bekliyoruz:`,
    lines || "Sepetinizde ürünler var.",
    `Toplam: ${formatTry(row.cartValueMinor)}`,
    storeUrl ? `\nSepete dön: ${storeUrl}/cart` : "",
    "",
    "Sorularınız için yazabilirsiniz.",
  ]
    .filter(Boolean)
    .join("\n");

  const customerDigits = phoneDigits(customerPhone);
  if (customerDigits.length < 10) {
    return { ok: false, error: "Geçersiz müşteri telefonu" };
  }

  return {
    ok: true,
    waUrl: buildWaMeUrl(customerDigits, text),
    phone: customerPhone,
  };
}

export async function markCartAbandonmentWhatsappReminded(
  siteId: string,
  abandonmentId: string,
): Promise<void> {
  await prisma.cartAbandonment.updateMany({
    where: { id: abandonmentId, siteId, status: "open" },
    data: { whatsappRemindedAt: new Date() },
  });
}
