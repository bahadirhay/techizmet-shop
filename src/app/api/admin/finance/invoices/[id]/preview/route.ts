import { NextResponse } from "next/server";
import { formatTry } from "@/lib/admin/money";
import { parseInvoiceLinesJson } from "@/lib/finance/invoices";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const invoice = await prisma.financeInvoice.findFirst({
    where: { id, siteId: auth.siteId },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      counterparty: true,
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }
  const lines = parseInvoiceLinesJson(invoice.linesJson);
  const counterpartyLabel = invoice.customer
    ? [invoice.customer.firstName, invoice.customer.lastName].filter(Boolean).join(" ") ||
      invoice.customer.email ||
      "Site müşterisi"
    : invoice.counterparty?.title || "Manuel karşı taraf";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.45;color:#111827">
      <h2 style="margin:0 0 8px">Fatura Önizleme</h2>
      <p style="margin:0 0 16px;color:#6b7280">Kesim öncesi kontrol amaçlıdır.</p>
      <p><b>Karşı taraf:</b> ${counterpartyLabel}</p>
      <p><b>Tarih:</b> ${new Date(invoice.issueDate).toLocaleDateString("tr-TR")}</p>
      <p><b>Kategori / Hesap:</b> ${invoice.category?.name ?? "—"} / ${invoice.account?.name ?? "—"}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead><tr>
          <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px 4px">Açıklama</th>
          <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px 4px">Miktar</th>
          <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px 4px">Birim</th>
          <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px 4px">KDV</th>
          <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px 4px">Tutar</th>
        </tr></thead>
        <tbody>
          ${lines
            .map(
              (l) => `<tr>
            <td style="border-bottom:1px solid #f3f4f6;padding:8px 4px">${l.description}</td>
            <td style="border-bottom:1px solid #f3f4f6;padding:8px 4px;text-align:right">${l.qty}</td>
            <td style="border-bottom:1px solid #f3f4f6;padding:8px 4px;text-align:right">${formatTry(l.unitPriceMinor)}</td>
            <td style="border-bottom:1px solid #f3f4f6;padding:8px 4px;text-align:right">%${l.vatRate}</td>
            <td style="border-bottom:1px solid #f3f4f6;padding:8px 4px;text-align:right">${formatTry(l.totalMinor)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <div style="margin-top:14px;text-align:right">
        <p><b>Ara Toplam:</b> ${formatTry(invoice.subtotalMinor)}</p>
        <p><b>KDV:</b> ${formatTry(invoice.vatMinor)}</p>
        <p style="font-size:18px"><b>Genel Toplam:</b> ${formatTry(invoice.totalMinor)}</p>
      </div>
    </div>
  `.trim();
  return NextResponse.json({ invoice, lines, html });
}
