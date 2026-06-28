"use client";

type LineItem = {
  description: string;
  qty: number;
  unitPriceTl: number;
  vatRate: number;
};

type Totals = {
  totalNet: number;
  totalVat: number;
  totalIncl: number;
};

type Props = {
  sellerTitle: string;
  sellerTaxId: string;
  sellerTaxOffice: string;
  recipientName: string;
  recipientTaxId: string;
  recipientTaxOffice: string;
  recipientAddress: string;
  recipientCity: string;
  recipientEmail: string;
  recipientPhone: string;
  invoiceDate: string;
  lines: LineItem[];
  totals: Totals;
};

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function InvoicePreview({
  sellerTitle,
  sellerTaxId,
  sellerTaxOffice,
  recipientName,
  recipientTaxId,
  recipientTaxOffice,
  recipientAddress,
  recipientCity,
  recipientEmail,
  recipientPhone,
  invoiceDate,
  lines,
  totals,
}: Props) {
  return (
    <div className="admin-card overflow-hidden">
      {/* Başlık bandı */}
      <div className="bg-zinc-800 px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white tracking-wide">FATURA ÖNİZLEME</span>
        <span className="text-xs text-zinc-400">GİB&apos;e gönderilmeden önce kontrol edin</span>
      </div>

      {/* Fatura gövdesi — kağıt görünümü */}
      <div className="bg-white p-8 text-sm text-zinc-800 font-sans print:p-4" style={{ fontFamily: "Arial, sans-serif" }}>

        {/* Üst: logo alanı + başlık */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xl font-bold text-zinc-800">{sellerTitle || "Satıcı Unvanı"}</div>
            {sellerTaxId && (
              <div className="text-xs text-zinc-500 mt-0.5">
                VKN: {sellerTaxId}
                {sellerTaxOffice && ` · ${sellerTaxOffice} Vergi Dairesi`}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-zinc-700 tracking-tight">e-Arşiv Fatura</div>
            <div className="text-xs text-zinc-400 mt-1">GİB Onaylı</div>
          </div>
        </div>

        {/* Fatura bilgileri + Alıcı yan yana */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Alıcı */}
          <div className="rounded-lg border border-zinc-200 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Alıcı</div>
            <div className="font-semibold text-zinc-800">{recipientName || <span className="text-zinc-300 italic">Alıcı adı girilmedi</span>}</div>
            {recipientTaxId && (
              <div className="text-xs text-zinc-500 mt-1">
                VKN/TC: {recipientTaxId}
                {recipientTaxOffice && ` · ${recipientTaxOffice} VD`}
              </div>
            )}
            {recipientAddress && <div className="text-xs text-zinc-500 mt-0.5">{recipientAddress}</div>}
            {recipientCity && <div className="text-xs text-zinc-500">{recipientCity}</div>}
            {recipientEmail && <div className="text-xs text-zinc-500 mt-0.5">{recipientEmail}</div>}
            {recipientPhone && <div className="text-xs text-zinc-500">{recipientPhone}</div>}
          </div>

          {/* Fatura detayları */}
          <div className="rounded-lg border border-zinc-200 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Fatura Bilgileri</div>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="text-zinc-500 py-0.5 pr-3">Fatura Tarihi</td>
                  <td className="font-medium text-zinc-800">{formatDate(invoiceDate)}</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 py-0.5 pr-3">Fatura No</td>
                  <td className="font-medium text-zinc-400 italic">GİB tarafından verilecek</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 py-0.5 pr-3">Para Birimi</td>
                  <td className="font-medium text-zinc-800">TRY — Türk Lirası</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Satır tablosu */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">#</th>
              <th className="border border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">Açıklama</th>
              <th className="border border-zinc-200 px-3 py-2 text-right text-xs font-semibold text-zinc-600">Adet</th>
              <th className="border border-zinc-200 px-3 py-2 text-right text-xs font-semibold text-zinc-600">Birim Fiyat</th>
              <th className="border border-zinc-200 px-3 py-2 text-right text-xs font-semibold text-zinc-600">KDV %</th>
              <th className="border border-zinc-200 px-3 py-2 text-right text-xs font-semibold text-zinc-600">KDV Tutarı</th>
              <th className="border border-zinc-200 px-3 py-2 text-right text-xs font-semibold text-zinc-600">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const net = Math.round(l.qty * l.unitPriceTl * 100) / 100;
              const vat = Math.round(net * l.vatRate) / 100;
              const total = Math.round((net + vat) * 100) / 100;
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                  <td className="border border-zinc-200 px-3 py-2 text-xs text-zinc-500">{i + 1}</td>
                  <td className="border border-zinc-200 px-3 py-2 text-xs text-zinc-800">
                    {l.description || <span className="italic text-zinc-300">Açıklama yok</span>}
                  </td>
                  <td className="border border-zinc-200 px-3 py-2 text-right text-xs">{l.qty}</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right text-xs">{fmt(l.unitPriceTl)} ₺</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right text-xs">%{l.vatRate}</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right text-xs">{fmt(vat)} ₺</td>
                  <td className="border border-zinc-200 px-3 py-2 text-right text-xs font-medium">{fmt(total)} ₺</td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={7} className="border border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400 italic">
                  Henüz satır eklenmedi
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Toplamlar */}
        <div className="flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-12 py-1 text-zinc-500">Ara Toplam (KDV Hariç)</td>
                <td className="text-right font-medium text-zinc-800">{fmt(totals.totalNet)} ₺</td>
              </tr>
              <tr>
                <td className="pr-12 py-1 text-zinc-500">Toplam KDV</td>
                <td className="text-right font-medium text-zinc-800">{fmt(totals.totalVat)} ₺</td>
              </tr>
              <tr className="border-t border-zinc-300">
                <td className="pr-12 py-2 font-bold text-zinc-800">GENEL TOPLAM</td>
                <td className="text-right font-bold text-lg text-zinc-900">{fmt(totals.totalIncl)} ₺</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Alt bilgi */}
        <div className="mt-8 border-t border-zinc-200 pt-4 text-[10px] text-zinc-400 text-center">
          Bu belge ön izlemedir. GİB e-Arşiv portalına gönderildiğinde resmi fatura numarası ve QR kodu atanacaktır.
        </div>
      </div>
    </div>
  );
}
