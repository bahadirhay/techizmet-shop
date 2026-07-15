import type { InvoiceDetails, InvoiceItem } from "fatura";
import { dedupeAddressSegments } from "@/lib/tr-address/format";

export type InvoicePreviewSeller = {
  storeName: string;
  sellerTitle?: string;
  sellerTaxId?: string;
  sellerTaxOffice?: string;
  sellerAddress?: string;
  sellerEmail?: string;
  sellerPhone?: string;
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

/** "Vergi Dairesi ve Numarası" tek satır: daire adı + VKN/TCKN. */
function taxLine(office?: string | null, taxId?: string | null): string {
  return [office?.trim(), taxId?.trim()].filter(Boolean).join(" — ") || "—";
}

/** Taraf (Kurumun / Müşterinin) bloğu — referans fatura düzeni. */
function partyBlock(
  label: string,
  name: string,
  addressLines: string[],
  office: string | null | undefined,
  taxId: string | null | undefined,
): string {
  const address = addressLines.map((s) => s?.trim()).filter(Boolean);
  const addressHtml = address.length
    ? address.map((l) => escapeHtml(l)).join("<br />")
    : "—";
  return `<div class="party">
    <p class="party-label">${escapeHtml(label)}</p>
    <table class="party-table">
      <tr><td class="k">Adı:</td><td>${escapeHtml(name)}</td></tr>
      <tr><td class="k">Adresi:</td><td>${addressHtml}</td></tr>
      <tr><td class="k">Vergi Dairesi ve Numarası:</td><td>${escapeHtml(taxLine(office, taxId))}</td></tr>
    </table>
  </div>`;
}

function itemRow(item: InvoiceItem, index: number): string {
  const qty = item.quantity ?? 1;
  const rate = item.VATRate ?? 0;
  const lineIncl = (item.price ?? 0) + (item.VATAmount ?? 0);
  return `<tr>
    <td class="c">${index + 1}</td>
    <td>${escapeHtml(item.name)}</td>
    <td class="c">${qty}</td>
    <td class="num">${formatTryAmount(item.unitPrice ?? 0)}</td>
    <td class="num">%${rate} · ${formatTryAmount(item.VATAmount ?? 0)}</td>
    <td class="num">${formatTryAmount(lineIncl)}</td>
  </tr>`;
}

/** GİB'e gönderilmeden önce yerel e-Arşiv ön izleme HTML'i (resmi fatura düzeni). */
export function renderInvoicePreviewHtml(
  details: InvoiceDetails,
  seller: InvoicePreviewSeller,
): string {
  const rows = details.items.map((item, i) => itemRow(item, i)).join("");
  const testBanner = seller.testMode
    ? `<div class="banner banner-test">TEST ORTAMI — Bu belge henüz GİB'e iletilmedi, ön izlemedir.</div>`
    : `<div class="banner banner-draft">ÖN İZLEME — GİB'e gönderilmeden önce kontrol edin.</div>`;

  const customer = customerDisplay(details);
  const customerAddress = dedupeAddressSegments(
    [details.fullAddress, details.district, details.city, details.zipCode]
      .filter(Boolean)
      .join(", "),
  );

  const sellerAddressLines = [
    seller.sellerAddress || "",
    seller.sellerPhone ? `Tel: ${seller.sellerPhone}` : "",
    seller.sellerEmail || "",
  ];
  const customerAddressLines = [
    customerAddress,
    details.phoneNumber ? `Tel: ${details.phoneNumber}` : "",
    details.email || "",
  ];

  const sellerParty = partyBlock(
    "Kurumun:",
    sellerDisplayName(seller),
    sellerAddressLines,
    seller.sellerTaxOffice,
    seller.sellerTaxId,
  );
  const customerParty = partyBlock(
    "Müşterinin:",
    customer,
    customerAddressLines,
    details.taxOffice,
    details.taxIDOrTRID,
  );

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>e-Arşiv ön izleme — ${escapeHtml(details.orderNumber ?? "")}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; font-size: 12px; color: #3f5164; margin: 0; padding: 16px; background: #f4f4f5; }
    .page { max-width: 210mm; margin: 0 auto; background: #fff; padding: 18mm 16mm; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .banner { padding: 9px 14px; margin-bottom: 18px; border-radius: 6px; font-weight: 600; text-align: center; font-size: 11px; }
    .banner-test { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .banner-draft { background: #eef2f6; color: #3f5164; border: 1px solid #cbd5dd; }
    .doc-head { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .doc-head table td { padding: 2px 6px; }
    .doc-head table td.k { color: #6b7a89; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 26px; }
    .party-label { font-style: italic; font-weight: 700; text-decoration: underline; color: #3f5164; margin: 0 0 6px; }
    .party-table td { vertical-align: top; padding: 2px 0; line-height: 1.4; }
    .party-table td.k { font-weight: 700; white-space: nowrap; padding-right: 10px; color: #3f5164; }
    .section-title { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: .04em; color: #3f5164; margin: 8px 0 12px; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    table.items th, table.items td { border: 1px solid #cbd5dd; padding: 9px 8px; text-align: left; font-size: 11px; }
    table.items th { background: #e2e8ee; text-transform: uppercase; letter-spacing: .02em; color: #3f5164; font-size: 10px; text-align: center; }
    table.items td.c { text-align: center; }
    table.items td.num { text-align: right; white-space: nowrap; }
    .th-sub { display: block; font-weight: 400; text-transform: none; letter-spacing: 0; color: #6b7a89; font-size: 9px; }
    .totals { margin-left: auto; width: min(100%, 320px); border-collapse: collapse; }
    .totals td { padding: 7px 10px; }
    .totals td:last-child { text-align: right; white-space: nowrap; }
    .totals tr.grand td { border-top: 2px solid #3f5164; border-bottom: 2px solid #3f5164; font-size: 14px; font-weight: 700; letter-spacing: .02em; }
    .footer { margin-top: 26px; font-size: 10px; color: #6b7a89; border-top: 1px solid #cbd5dd; padding-top: 12px; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; padding: 12mm; max-width: none; }
      .banner { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      table.items th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${testBanner}

    <div class="doc-head">
      <table>
        <tr><td class="k">Fatura No :</td><td>${escapeHtml(details.orderNumber ?? "—")}</td></tr>
        <tr><td class="k">Tarih :</td><td>${escapeHtml(details.date)} ${escapeHtml(details.time)}</td></tr>
      </table>
    </div>

    <div class="parties">
      ${sellerParty}
      ${customerParty}
    </div>

    <h2 class="section-title">ÜRÜN / HİZMET BİLGİLERİ</h2>

    <table class="items">
      <thead>
        <tr>
          <th>Sıra No</th>
          <th>Ürün / Hizmet Açıklaması</th>
          <th>Adet</th>
          <th>Birim Fiyatı<span class="th-sub">(KDV hariç)</span></th>
          <th>KDV<span class="th-sub">(oran · tutar)</span></th>
          <th>Toplam<span class="th-sub">(KDV dâhil)</span></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals">
      <tr><td>Mal / Hizmet Toplamı (KDV hariç)</td><td>${formatTryAmount(details.grandTotal)}</td></tr>
      <tr><td>Hesaplanan KDV</td><td>${formatTryAmount(details.totalVAT)}</td></tr>
      <tr class="grand"><td>GENEL TOPLAM (KDV dâhil)</td><td>${formatTryAmount(details.grandTotalInclVAT)}</td></tr>
      <tr><td>Ödenecek Tutar</td><td>${formatTryAmount(details.paymentTotal)}</td></tr>
    </table>

    <p class="footer">
      Fatura No kesim sırasında GİB tarafından atanır. Satıcı bilgileri GİB mükellef kaydınızdan gelir.
      Bu belge yalnızca kesim öncesi kontrol içindir; &quot;Onayla ve GİB'e gönder&quot; ile resmi e-Arşiv faturası oluşturulur.
    </p>
  </div>
</body>
</html>`;
}
