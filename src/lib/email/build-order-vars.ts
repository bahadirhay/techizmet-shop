import { formatTry } from "@/lib/admin/money";

function paymentLabel(method: string) {
  if (method === "cod") return "Kapıda ödeme";
  if (method === "bank_transfer") return "Havale / EFT";
  if (method === "card") return "Kredi kartı";
  return method;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Onay bekliyor",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim edildi",
  cancelled: "İptal",
  refund_requested: "İade talebi",
};

export function buildLinesTableHtml(
  lines: { title: string; qty: number; lineMinor: number }[],
): string {
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${l.title} × ${l.qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatTry(l.lineMinor)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>`;
}

export function buildLinesText(
  lines: { title: string; qty: number; lineMinor: number }[],
): string {
  return lines.map((l) => `${l.title} × ${l.qty} — ${formatTry(l.lineMinor)}`).join("\n");
}

export function buildOrderEmailVars(input: {
  customerName: string;
  orderNumber: string;
  totalMinor: number;
  paymentMethod: string;
  storeName: string;
  trackingNumber?: string | null;
  status?: string;
  lines: { title: string; qty: number; lineMinor: number }[];
  streetFoodContribution?: string;
  streetFoodContributionHtml?: string;
}): Record<string, string> {
  return {
    customerName: input.customerName || "değerli müşterimiz",
    orderNumber: input.orderNumber,
    total: formatTry(input.totalMinor),
    paymentMethod: paymentLabel(input.paymentMethod),
    linesTable: buildLinesTableHtml(input.lines),
    linesText: buildLinesText(input.lines),
    storeName: input.storeName,
    trackingNumber: input.trackingNumber?.trim() || "—",
    statusLabel: STATUS_LABELS[input.status ?? ""] ?? input.status ?? "",
    streetFoodContribution: input.streetFoodContribution ?? "",
    streetFoodContributionHtml: input.streetFoodContributionHtml ?? "",
  };
}
