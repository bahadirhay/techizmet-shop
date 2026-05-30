export function AdminField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--kn-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--kn-brand)]";

export const btnPrimary =
  "rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";

export const btnSecondary =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50";
