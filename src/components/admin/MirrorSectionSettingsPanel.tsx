"use client";

import type { MirrorPageSectionEdit } from "@/lib/mirror-home-overlay";

export function MirrorSectionSettingsPanel({
  sectionLabel,
  sectionType,
  edit,
  onChange,
}: {
  sectionLabel: string;
  sectionType: string;
  edit: MirrorPageSectionEdit | undefined;
  onChange: (patch: MirrorPageSectionEdit) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Bölüm: {sectionLabel}</p>
      <p className="text-xs text-zinc-500">Tip: {sectionType}</p>
      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={Boolean(edit?.hidden)}
          onChange={(e) => onChange({ ...edit, hidden: e.target.checked })}
        />
        Bu bölümü vitrinde gizle
      </label>
      <p className="text-xs text-amber-200/80">
        Sol listeden ⋮⋮ ile bölüm sırasını sürükleyin. Gizli bölümler vitrinde görünmez.
      </p>
    </div>
  );
}
