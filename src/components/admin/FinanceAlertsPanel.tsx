import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { FinanceAlert } from "@/lib/finance/finance-alerts";

const SEVERITY_STYLES: Record<FinanceAlert["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
};

const SEVERITY_LABEL: Record<FinanceAlert["severity"], string> = {
  critical: "Kritik",
  warning: "Uyarı",
  info: "Bilgi",
};

export function FinanceAlertsPanel({ alerts }: { alerts: FinanceAlert[] }) {
  if (alerts.length === 0) {
    return (
      <section className="admin-card admin-card-pad mt-6 border-emerald-200 bg-emerald-50/50">
        <p className="text-sm text-emerald-900">Şu an kritik muhasebe uyarısı yok.</p>
      </section>
    );
  }

  return (
    <section className="admin-card admin-card-pad mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Uyarılar</h2>
        <Link href="/admin/finance/cari" className="text-sm text-[var(--kn-brand)] underline">
          Cari & alacak/borç →
        </Link>
      </div>
      <ul className="mt-4 space-y-2">
        {alerts.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 transition hover:opacity-90 ${SEVERITY_STYLES[a.severity]}`}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                  {SEVERITY_LABEL[a.severity]}
                  {a.count != null ? ` · ${a.count} kayıt` : ""}
                </p>
                <p className="mt-0.5 font-medium">{a.title}</p>
                <p className="mt-1 text-sm opacity-90">{a.description}</p>
              </div>
              {a.amountMinor != null && a.id !== "cari-summary" ? (
                <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
                  {formatTry(a.amountMinor)}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
