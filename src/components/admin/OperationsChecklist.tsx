import Link from "next/link";
import type { OperationsChecklistSnapshot } from "@/lib/admin/operations-checklist";

export function OperationsChecklist({ snapshot }: { snapshot: OperationsChecklistSnapshot }) {
  const pct =
    snapshot.totalCount > 0
      ? Math.round((snapshot.completedCount / snapshot.totalCount) * 100)
      : 0;

  return (
    <section className="admin-card admin-card-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Operasyon kurulumu</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Kargo ve fatura için bir kez tamamlanacak ayarlar.{" "}
            <span className="font-medium text-zinc-800">
              {snapshot.completedCount}/{snapshot.totalCount}
            </span>{" "}
            tamam ({pct}%)
          </p>
        </div>
        {snapshot.allDone ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            Kurulum tamam
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            Eksik adım var
          </span>
        )}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-[var(--kn-brand)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {snapshot.items.map((item) => (
          <li
            key={item.id}
            className={`flex gap-3 rounded-lg border p-3 ${
              item.done ? "border-green-200 bg-green-50/50" : "border-zinc-200 bg-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                item.done ? "bg-green-600 text-white" : "border-2 border-zinc-300 text-transparent"
              }`}
              aria-hidden
            >
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="mt-0.5 text-xs text-zinc-600">{item.description}</p>
              {!item.done ? (
                <Link
                  href={item.href}
                  className="mt-2 inline-block text-sm font-medium text-[var(--kn-brand)] underline"
                >
                  Ayarla →
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-zinc-200 pt-4">
        <h3 className="text-sm font-semibold text-zinc-800">Günlük operasyon</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {snapshot.quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm hover:border-[var(--kn-brand)] hover:bg-white"
            >
              {link.label}
              {link.count != null && link.count > 0 ? (
                <span className="rounded-full bg-[var(--kn-brand)] px-1.5 py-0.5 text-xs font-medium text-white">
                  {link.count}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
