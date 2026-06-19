import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { CariCounterpartyDetail } from "@/lib/finance/cari-ledger";

export function FinanceCounterpartyDetailView({ detail }: { detail: CariCounterpartyDetail }) {
  return (
    <div className="space-y-6">
      <div className="admin-kpi-grid">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Alacak</p>
          <p className="admin-kpi-value">{formatTry(detail.receivableMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#dc2626" }}>
          <p className="admin-kpi-label">Borç</p>
          <p className="admin-kpi-value">{formatTry(detail.payableMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Net bakiye</p>
          <p className="admin-kpi-value">{formatTry(detail.netMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#7c3aed" }}>
          <p className="admin-kpi-label">Açık fatura</p>
          <p className="admin-kpi-value">{detail.openInvoiceCount}</p>
        </div>
        {detail.creditLimitMinor != null ? (
          <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#0d9488" }}>
            <p className="admin-kpi-label">Risk limiti</p>
            <p className="admin-kpi-value">{formatTry(detail.creditLimitMinor)}</p>
            <p className="text-xs text-zinc-500">
              Kullanılabilir: {formatTry(detail.availableCreditMinor ?? 0)}
            </p>
          </div>
        ) : null}
      </div>

      <section className="admin-card admin-card-pad grid gap-2 text-sm md:grid-cols-2">
        {detail.tags ? (
          <p>
            <span className="text-zinc-500">Etiketler:</span> {detail.tags}
          </p>
        ) : null}
        {detail.paymentTermDays != null ? (
          <p>
            <span className="text-zinc-500">Vade:</span> {detail.paymentTermDays} gün
          </p>
        ) : null}
        {detail.openAccountEnabled ? (
          <p>
            <span className="text-zinc-500">Açık hesap:</span> Aktif
          </p>
        ) : null}
        {detail.creditHold ? (
          <p className="text-red-700">
            <span className="font-medium">Cari risk kilidi aktif</span>
          </p>
        ) : null}
        {detail.taxId ? (
          <p>
            <span className="text-zinc-500">VKN/TCKN:</span> {detail.taxId}
          </p>
        ) : null}
        {detail.email ? (
          <p>
            <span className="text-zinc-500">E-posta:</span> {detail.email}
          </p>
        ) : null}
        {detail.phone ? (
          <p>
            <span className="text-zinc-500">Telefon:</span> {detail.phone}
          </p>
        ) : null}
        {detail.customerId ? (
          <p>
            <span className="text-zinc-500">Müşteri kartı:</span>{" "}
            <Link href={`/admin/customers`} className="underline">
              Müşteri listesinde görüntüle
            </Link>
          </p>
        ) : null}
      </section>

      <section className="admin-card admin-card-pad">
        <h2 className="font-semibold">Vade yaşlandırma</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-zinc-500">Vadesi gelmemiş</p>
            <p className="mt-1 font-semibold tabular-nums">{formatTry(detail.aging.current)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-xs text-amber-800">1–30 gün gecikmiş</p>
            <p className="mt-1 font-semibold tabular-nums">{formatTry(detail.aging.d1_30)}</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
            <p className="text-xs text-orange-800">31–60 gün</p>
            <p className="mt-1 font-semibold tabular-nums">{formatTry(detail.aging.d31_60)}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
            <p className="text-xs text-red-800">60+ gün</p>
            <p className="mt-1 font-semibold tabular-nums">{formatTry(detail.aging.d60plus)}</p>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card-pad">
        <h2 className="font-semibold">Açık kalemler</h2>
        {detail.openItems.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Bu caride açık fatura yok.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Tür</th>
                <th className="pb-2">Açıklama</th>
                <th className="pb-2">Vade</th>
                <th className="pb-2 text-right">Açık</th>
              </tr>
            </thead>
            <tbody>
              {detail.openItems.map((item) => (
                <tr key={item.invoiceId} className="border-b border-zinc-100">
                  <td className="py-2 pr-2">
                    {item.direction === "outgoing" ? "Alacak" : "Borç"}
                  </td>
                  <td className="py-2 pr-2">{item.title ?? "Fatura"}</td>
                  <td className="py-2 pr-2">
                    {(item.dueDate ?? item.issueDate).toLocaleDateString("tr-TR")}
                    {item.daysOverdue > 0 ? (
                      <span className="ml-2 text-xs text-red-600">+{item.daysOverdue}g</span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatTry(item.openMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-card admin-card-pad">
        <h2 className="font-semibold">Hareket defteri</h2>
        {detail.ledger.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Henüz hareket yok.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Tarih</th>
                <th className="pb-2">Açıklama</th>
                <th className="pb-2 text-right">Borç</th>
                <th className="pb-2 text-right">Alacak</th>
              </tr>
            </thead>
            <tbody>
              {detail.ledger.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {row.date.toLocaleDateString("tr-TR")}
                  </td>
                  <td className="py-2 pr-2">
                    {row.refHref ? (
                      <Link href={row.refHref} className="underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {row.debitMinor > 0 ? formatTry(row.debitMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.creditMinor > 0 ? formatTry(row.creditMinor) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/finance/transactions/new?kind=payment_in"
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Tahsilat kaydet
        </Link>
        <Link
          href="/admin/finance/transactions/new?kind=payment_out"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
        >
          Ödeme kaydet
        </Link>
        <Link
          href="/admin/finance/invoices"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
        >
          Fatura ekle
        </Link>
      </div>
    </div>
  );
}
