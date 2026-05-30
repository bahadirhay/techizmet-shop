import { formatTry } from "@/lib/format";
import { telegramNotifications } from "@/lib/notification-settings";
import type { SiteSettings } from "@/lib/site-settings";

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Kapıda ödeme",
  bank: "Havale / EFT",
  card: "Kredi kartı",
};

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const raw = (await res.text().catch(() => "")) || "";
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}${raw ? `: ${raw.slice(0, 300)}` : ""}` };
    }
    const json = JSON.parse(raw || "{}") as { ok?: boolean; description?: string };
    if (json.ok === false) {
      return { ok: false, error: json.description ?? "Telegram API hatası" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendTelegramTestMessage(
  settings: SiteSettings,
  siteName: string,
): Promise<{ ok: true } | { ok: false; error: string; skipped?: boolean }> {
  const tg = telegramNotifications(settings);
  if (!tg.botToken || !tg.chatId) {
    return { ok: false, error: "Bot token ve chat id gerekli.", skipped: true };
  }
  const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  return sendTelegramMessage(
    tg.botToken,
    tg.chatId,
    ["Telegram test bildirimi", "", `Mağaza: ${siteName}`, `Zaman: ${now}`].join("\n"),
  );
}

export async function notifyTelegramNewOrder(
  settings: SiteSettings,
  siteName: string,
  order: {
    id: string;
    orderNumber: string;
    totalMinor: number;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    paymentMethod?: string | null;
    lines?: { title: string; qty: number }[];
  },
): Promise<{ ok: true } | { ok: false; error: string; skipped?: boolean }> {
  const tg = telegramNotifications(settings);
  if (!tg.enabled || !tg.onNewOrder) {
    return { ok: false, error: "Telegram kapalı.", skipped: true };
  }
  if (!tg.botToken || !tg.chatId) {
    return { ok: false, error: "Bot token veya chat id eksik.", skipped: true };
  }

  const baseUrl = process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ?? "";
  const adminUrl = baseUrl ? `${baseUrl}/admin/orders/${order.id}` : "";
  const pay = PAYMENT_LABELS[order.paymentMethod?.trim() ?? ""] ?? order.paymentMethod ?? "—";
  const lines =
    order.lines?.length ?
      order.lines
        .slice(0, 8)
        .map((l) => `• ${l.qty}× ${l.title}`)
        .join("\n")
    : null;

  const text = [
    "Yeni sipariş",
    "",
    `Mağaza: ${siteName}`,
    `Sipariş: #${order.orderNumber}`,
    `Tutar: ${formatTry(order.totalMinor)}`,
    `Ödeme: ${pay}`,
    `Müşteri: ${order.customerName?.trim() || "—"}`,
    `Telefon: ${order.customerPhone?.trim() || "—"}`,
    `E-posta: ${order.customerEmail?.trim() || "—"}`,
    lines ? ["", "Ürünler:", lines].join("\n") : null,
    adminUrl ? ["", `Panel: ${adminUrl}`].join("\n") : null,
  ]
    .filter(Boolean)
    .join("\n");

  const sent = await sendTelegramMessage(tg.botToken, tg.chatId, text);
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true };
}
