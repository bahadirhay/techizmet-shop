import type { InvoiceDetails, InvoiceItem } from "fatura";

export type InvoicePreviewSeller = {
  storeName: string;
  sellerTitle?: string;
  sellerTaxId?: string;
  sellerTaxOffice?: string;
  testMode?: boolean;
};

function sellerDisplayName(seller: InvoicePreviewSeller): string {
  return seller.sellerTitle?.trim() || seller.storeName.trim() || "Mağaza";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTryAmount(n: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
}

function customerDisplay(details: InvoiceDetails): string {
  const title = details.title?.trim();
  const name = [details.name, details.surname].filter(Boolean).join(" ").trim();
  return title || name || "Müşteri";
}

function itemRow(item: InvoiceItem, index: number): string {
  const qty = item.quantity ?? 1;
  const vatRate = item.VATRate ?? 0;
  const lineIncl = (item.price ?? 0) + (item.VATAmount ?? 0);
  return `<tr>
    <td class="num">${index + 1}</td>
    <td>${escapeHtml(item.name)}</td>
    <td class="num">${qty}</td>
    <td class="num">${formatTryAmount(item.unitPrice ?? 0)}</td>
    <td class="num">%${vatRate}</td>
    <td class="num">${formatTryAmount(item.price ?? 0)}</td>
    <td class="num">${formatTryAmount(item.VATAmount ?? 0)}</td>
    <td class="num">${formatTryAmount(lineIncl)}</td>
  </tr>`;
}

/** GİB'e gönderilmeden önce yerel e-Arşiv ön izleme HTML'i (yaklaşık resmi düzen). */
export function renderInvoicePreviewHtml(
  details: InvoiceDetails,
  seller: InvoicePreviewSeller,
): string {
  const rows = details.items.map((item, i) => itemRow(item, i)).join("");
  const testBanner = seller.testMode
    ? `<div class="banner-test">TEST ORTAMI — Bu belge henüz GİB'e iletilmedi, ön izlemedir.</div>`
    : `<div class="banner-draft">ÖN İZLEME — GİB'e gönderilmeden önce kontrol edin.</div>`;

  const customer = customerDisplay(details);
  const address = [
    details.fullAddress,
    details.district,
    details.city,
    details.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>e-Arşiv ön izleme — ${escapeHtml(details.orderNumber ?? "")}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 16px; background: #f4f4f5; }
    .page { max-width: 210mm; margin: 0 auto; background: #fff; padding: 20mm 16mm; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .banner-test, .banner-draft { padding: 10px 14px; margin-bottom: 16px; border-radius: 6px; font-weight: 600; text-align: center; }
    .banner-test { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .banner-draft { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: .02em; }
    .subtitle { color: #52525b; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .box { border: 1px solid #e4e4e7; border-radius: 6px; padding: 12px; }
    .box h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #71717a; margin: 0 0 8px; }
    .box p { margin: 4px 0; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e4e4e7; padding: 8px 6px; text-align: left; }
    th { background: #f4f4f5; font-size: 10px; text-transform: uppercase; color: #52525b; }
    td.num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: min(100%, 280px); }
    .totals tr td { border: none; padding: 6px 8px; }
    .totals tr td:last-child { text-align: right; font-weight: 600; }
    .totals tr.grand td { border-top: 2px solid #18181b; font-size: 14px; padding-top: 10px; }
    .footer { margin-top: 24px; font-size: 10px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 12px; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; padding: 12mm; max-width: none; }
      .banner-test, .banner-draft { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${testBanner}
    <h1>e-ARŞİV FATURA</h1>
    <p class="subtitle">Ön izleme · Sipariş ${escapeHtml(details.orderNumber ?? "—")} · ${escapeHtml(details.date)} ${escapeHtml(details.time)}</p>

    <div class="grid">
      <div class="box">
        <h2>Satıcı</h2>
        <p><strong>${escapeHtml(sellerDisplayName(seller))}</strong></p>
        ${seller.sellerTaxId ? `<p>VKN: ${escapeHtml(seller.sellerTaxId)}</p>` : ""}
        ${seller.sellerTaxOffice ? `<p>Vergi dairesi: ${escapeHtml(seller.sellerTaxOffice)}</p>` : ""}
        <p class="footer" style="margin:8px 0 0;border:0;padding:0">GİB e-Arşiv portalı üzerinden kesilecektir.</p>
      </div>
      <div class="box">
        <h2>Alıcı</h2>
        <p><strong>${escapeHtml(customer)}</strong></p>
        <p>VKN/TCKN: ${escapeHtml(details.taxIDOrTRID ?? "—")}</p>
        ${details.taxOffice ? `<p>Vergi dairesi: ${escapeHtml(details.taxOffice)}</p>` : ""}
        <p>${escapeHtml(address || "—")}</p>
        ${details.phoneNumber ? `<p>Tel: ${escapeHtml(details.phoneNumber)}</p>` : ""}
        ${details.email ? `<p>E-posta: ${escapeHtml(details.email)}</p>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Mal / Hizmet</th>
          <th>Miktar</th>
          <th>Birim fiyat (KDV hariç)</th>
          <th>KDV %</th>
          <th>Matrah</th>
          <th>KDV</th>
          <th>Toplam (KDV dahil)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      <tr><td>Toplam KDV</td><td>${formatTryAmount(details.totalVAT)}</td></tr>
      <tr><td>Toplam (KDV hariç)</td><td>${formatTryAmount(details.grandTotal)}</td></tr>
      <tr class="grand"><td>Genel toplam (KDV dahil)</td><td>${formatTryAmount(details.grandTotalInclVAT)}</td></tr>
      <tr><td>Ödenecek tutar</td><td>${formatTryAmount(details.paymentTotal)}</td></tr>
    </table>

    <p class="footer">
      Bu belge yalnızca kesim öncesi kontrol içindir. &quot;Onayla ve GİB'e gönder&quot; ile resmi e-Arşiv faturası oluşturulur.
    </p>
  </div>
</body>
</html>`;
}
