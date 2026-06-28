import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { UnifiedCariRow, ReceivablePayableRow } from "@/lib/finance/cari-ledger";
import { CreateCariButton } from "@/components/admin/CreateCariButton";

type Tab = "cariler" | "alacak" | "borc";

function counterpartyTypeLabel(type: string): string {
  if (type === "site_member") return "Üye";
  return "Dış cari";
}

export function FinanceCariClient({
  tab,
  allRows,
  receivables,
  payables,
  totalReceivableMinor,
  totalPayableMinor,
}: {
  tab: Tab;
  allRows: UnifiedCariRow[];
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

  const counterpartyRows = allRows.filter((r) => r.kind === "counterparty");
  const noCariRows = allRows.filter((r) => r.kind === "customer_no_cari");

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
            {t.id === "cariler" && allRows.length > 0 && (
              <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                {allRows.length}
              </span>
            )}
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
        <div className="mt-6 space-y-6">
          {/* Cari kayıtları */}
          <section className="admin-card admin-card-pad">
            <h2 className="font-semibold">
              Cari kartlar
              {counterpartyRows.length > 0 && (
                <span className="ml-2 text-sm font-normal text-zinc-500">({counterpartyRows.length})</span>
              )}
            </h2>
            {counterpartyRows.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                Henüz cari kaydı yok. Aşağıdaki üyelerden veya{" "}
                <Link href="/admin/finance/master-data" className="underline">
                  Karşı taraf ekle
                </Link>{" "}
                sayfasından oluşturun.
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
                  {counterpartyRows.map((row) => {
                    if (row.kind !== "counterparty") return null;
                    return (
                      <tr key={row.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2">
                          <Link href={`/admin/finance/counterparties/${row.id}`} className="font-medium underline">
                            {row.title}
                          </Link>
                          {row.taxId ? <p className="text-xs text-zinc-500">VKN/TCKN: {row.taxId}</p> : null}
                          {row.email ? <p className="text-xs text-zinc-400">{row.email}</p> : null}
                          {row.tags ? <p className="text-xs text-indigo-700">{row.tags}</p> : null}
                          {row.creditLimitMinor != null ? (
                            <p className="text-xs text-zinc-500">
                              Limit: {formatTry(row.creditLimitMinor)}
                              {row.creditHold ? " · KİLİTLİ" : ""}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2 pr-2 text-zinc-500">{counterpartyTypeLabel(row.type)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-emerald-700">
                          {formatTry(row.receivableMinor)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-red-700">
                          {formatTry(row.payableMinor)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums font-medium">
                          {formatTry(row.netMinor)}
                        </td>
                        <td className="py-2 text-right">{row.openInvoiceCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Carisi olmayan siparişli üyeler */}
          {noCariRows.length > 0 && (
            <section className="admin-card admin-card-pad">
              <h2 className="font-semibold">
                Sipariş veren üyeler — cari kaydı yok
                <span className="ml-2 text-sm font-normal text-zinc-500">({noCariRows.length})</span>
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Bu üyelere fatura keserken veya cari takibe almak istediğinizde &quot;Cari Aç&quot; butonu ile tek tıkla ekleyebilirsiniz.
              </p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-zinc-500">
                    <th className="pb-2">Üye</th>
                    <th className="pb-2 text-right">Sipariş</th>
                    <th className="pb-2 text-right">Toplam alım</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {noCariRows.map((row) => {
                    if (row.kind !== "customer_no_cari") return null;
                    return (
                      <tr key={row.customerId} className="border-b border-zinc-100">
                        <td className="py-2 pr-2">
                          <Link href={`/admin/customers/${row.customerId}`} className="font-medium underline">
                            {row.title}
                          </Link>
                          {row.taxId ? <p className="text-xs text-zinc-500">VKN/TCKN: {row.taxId}</p> : null}
                          {row.email ? <p className="text-xs text-zinc-400">{row.email}</p> : null}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-zinc-600">
                          {row.orderCount}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-zinc-700">
                          {formatTry(row.totalSpentMinor)}
                        </td>
                        <td className="py-2 text-right">
                          <CreateCariButton customerId={row.customerId} title={row.title} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
        </div>
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
