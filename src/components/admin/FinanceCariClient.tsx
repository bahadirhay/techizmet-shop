import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { CariCounterpartySummary, ReceivablePayableRow } from "@/lib/finance/cari-ledger";

type Tab = "cariler" | "alacak" | "borc";

function counterpartyTypeLabel(type: string): string {
  if (type === "site_member") return "Müşteri / üye";
  return "Dış cari";
}

export function FinanceCariClient({
  tab,
  summaries,
  receivables,
  payables,
  totalReceivableMinor,
  totalPayableMinor,
}: {
  tab: Tab;
  summaries: CariCounterpartySummary[];
  receivables: ReceivablePayableRow[];
  payables: ReceivablePayableRow[];
  totalReceivableMinor: number;
  totalPayableMinor: number;
}) {
  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "cariler", label: "Tüm cariler", href: "/admin/finance/cari?tab=cariler" },
    { id: "alacak", label: "Alacaklar", href: "/admin/finance/cari?tab=alacak" },
    { id: "borc", label: "Borçlar", href: "/admin/finance/cari?tab=borc" },
  ];

  const activeCariler = summaries.filter((s) => s.receivableMinor > 0 || s.payableMinor > 0);

  return (
    <div>
      <div className="admin-kpi-grid">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Toplam alacak</p>
          <p className="admin-kpi-value">{formatTry(totalReceivableMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#dc2626" }}>
          <p className="admin-kpi-label">Toplam borç</p>
          <p className="admin-kpi-value">{formatTry(totalPayableMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Net pozisyon</p>
          <p className="admin-kpi-value">{formatTry(totalReceivableMinor - totalPayableMinor)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              tab === t.id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href="/admin/finance/master-data"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          + Karşı taraf ekle
        </Link>
      </div>

      {tab === "cariler" ? (
        <section className="admin-card admin-card-pad mt-6">
          <h2 className="font-semibold">Cari kartlar</h2>
          {activeCariler.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Açık alacak/borç yok. Fatura ekleyin veya karşı taraf tanımlayın.
            </p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-zinc-500">
                  <th className="pb-2">Cari</th>
                  <th className="pb-2">Tür</th>
                  <th className="pb-2 text-right">Alacak</th>
                  <th className="pb-2 text-right">Borç</th>
                  <th className="pb-2 text-right">Net</th>
                  <th className="pb-2 text-right">Açık fatura</th>
                </tr>
              </thead>
              <tbody>
                {activeCariler.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-2">
                      <Link href={`/admin/finance/counterparties/${s.id}`} className="font-medium underline">
                        {s.title}
                      </Link>
                      {s.taxId ? <p className="text-xs text-zinc-500">VKN/TCKN: {s.taxId}</p> : null}
                      {s.tags ? <p className="text-xs text-indigo-700">{s.tags}</p> : null}
                      {s.creditLimitMinor != null ? (
                        <p className="text-xs text-zinc-500">
                          Limit: {formatTry(s.creditLimitMinor)}
                          {s.creditHold ? " · KİLİTLİ" : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2">{counterpartyTypeLabel(s.type)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-emerald-700">
                      {formatTry(s.receivableMinor)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-red-700">
                      {formatTry(s.payableMinor)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums font-medium">
                      {formatTry(s.netMinor)}
                    </td>
                    <td className="py-2 text-right">{s.openInvoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {tab === "alacak" ? (
        <OpenItemsTable title="Alacaklar (tahsil edilecek)" rows={receivables} empty="Açık alacak yok." />
      ) : null}

      {tab === "borc" ? (
        <OpenItemsTable title="Borçlar (ödenecek)" rows={payables} empty="Açık borç yok." />
      ) : null}
    </div>
  );
}

function OpenItemsTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ReceivablePayableRow[];
  empty: string;
}) {
  return (
    <section className="admin-card admin-card-pad mt-6">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">{empty}</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-zinc-500">
              <th className="pb-2">Cari</th>
              <th className="pb-2">Fatura</th>
              <th className="pb-2">Vade</th>
              <th className="pb-2">Gecikme</th>
              <th className="pb-2 text-right">Açık tutar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.invoiceId} className="border-b border-zinc-100">
                <td className="py-2 pr-2">
                  {r.counterpartyId ? (
                    <Link
                      href={`/admin/finance/counterparties/${r.counterpartyId}`}
                      className="underline"
                    >
                      {r.counterpartyTitle}
                    </Link>
                  ) : (
                    r.counterpartyTitle
                  )}
                </td>
                <td className="py-2 pr-2">{r.title ?? "—"}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {(r.dueDate ?? r.issueDate).toLocaleDateString("tr-TR")}
                </td>
                <td className="py-2 pr-2">
                  {r.daysOverdue > 0 ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">
                      {r.daysOverdue} gün
                    </span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums font-medium">{formatTry(r.openMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
