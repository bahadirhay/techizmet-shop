"use client";

import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { htmlToPlainText, plainTextToSimpleHtml } from "@/lib/html-plain-text";
import type { MirrorElementEdit, MirrorElementKind, MirrorElementPick } from "@/lib/mirror-element-edits";

const KIND_LABELS: Record<MirrorElementKind, string> = {
  html: "Metin",
  text: "Düz metin",
  image: "Görsel",
  link: "Link",
};

export function MirrorElementEditPanel({
  pick,
  edit,
  onChange,
  onClear,
}: {
  pick: MirrorElementPick;
  edit: MirrorElementEdit | undefined;
  onChange: (edit: MirrorElementEdit) => void;
  onClear: () => void;
}) {
  const kind = edit?.kind ?? pick.kind;
  const rawValue =
    kind === "image"
      ? (edit?.imageUrl ?? pick.value)
      : kind === "link"
        ? (edit?.href ?? pick.value)
        : kind === "html"
          ? (edit?.html ?? pick.value)
          : (edit?.text ?? pick.value);

  const value = kind === "html" ? htmlToPlainText(rawValue) : rawValue;

  function emit(next: string) {
    const base: MirrorElementEdit = { id: pick.id, kind };
    if (kind === "image") onChange({ ...base, imageUrl: next });
    else if (kind === "link") onChange({ ...base, href: next });
    else if (kind === "html") onChange({ ...base, html: plainTextToSimpleHtml(next) });
    else onChange({ ...base, text: next });
  }

  return (
    <div className="mt-2 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-rose-400">Seçili alan</p>
      <p className="mt-1 text-sm text-zinc-100">{KIND_LABELS[kind]}</p>
      <p className="mt-1 truncate text-xs text-zinc-500" title={pick.label}>
        {pick.label}
      </p>

      {kind === "image" ? (
        <div className="mt-3">
          <MirrorImageField label="Görsel" value={rawValue} onChange={(url) => emit(url)} />
        </div>
      ) : kind === "link" ? (
        <label className="mt-3 block text-xs text-zinc-400">
          Link URL
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={rawValue}
            onChange={(e) => emit(e.target.value)}
          />
        </label>
      ) : (
        <label className="mt-3 block text-xs text-zinc-400">
          Metin
          <span className="mt-1 block text-[11px] font-normal text-zinc-600">
            Enter ile yeni satır — &lt;br /&gt; yazmayın
          </span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            rows={kind === "html" ? 8 : 4}
            value={value}
            onChange={(e) => emit(e.target.value)}
          />
        </label>
      )}

      <button
        type="button"
        className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-300"
        onClick={onClear}
      >
        Seçimi temizle
      </button>
    </div>
  );
}
