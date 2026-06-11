"use client";

import type { MirrorElementTypography, MirrorFontPreset, MirrorTextAlign } from "@/lib/mirror-element-typography";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100";

const FONT_SIZE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tema varsayılanı" },
  { value: "14px", label: "14 px — küçük" },
  { value: "16px", label: "16 px — normal" },
  { value: "18px", label: "18 px" },
  { value: "20px", label: "20 px" },
  { value: "24px", label: "24 px" },
  { value: "28px", label: "28 px" },
  { value: "32px", label: "32 px" },
  { value: "40px", label: "40 px — büyük" },
  { value: "h6", label: "Başlık H6 (tema)" },
  { value: "h5", label: "Başlık H5 (tema)" },
  { value: "h4", label: "Başlık H4 (tema)" },
  { value: "h3", label: "Başlık H3 (tema)" },
  { value: "h2", label: "Başlık H2 (tema)" },
];

export function MirrorTypographyFields({
  value,
  onChange,
  compact,
}: {
  value: MirrorElementTypography | undefined;
  onChange: (next: MirrorElementTypography | undefined) => void;
  compact?: boolean;
}) {
  const v = value ?? {};

  function patch(partial: Partial<MirrorElementTypography>) {
    const next: MirrorElementTypography = { ...v, ...partial };
    if (!next.align) delete next.align;
    if (!next.fontPreset || next.fontPreset === "inherit") delete next.fontPreset;
    if (!next.fontSize) delete next.fontSize;
    if (!next.color) delete next.color;
    onChange(Object.keys(next).length ? next : undefined);
  }

  const grid = compact
    ? "mt-2 grid grid-cols-2 gap-2"
    : "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2";

  return (
    <div className={`rounded-lg border border-zinc-700/80 bg-zinc-950/40 ${compact ? "p-2" : "p-3"}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Görünüm
      </p>
      <div className={grid}>
        <label className="block text-[11px] text-zinc-500">
          Hizalama
          <select
            className={inputClass}
            value={v.align ?? ""}
            onChange={(e) =>
              patch({
                align: (e.target.value || undefined) as MirrorTextAlign | undefined,
              })
            }
          >
            <option value="">Tema varsayılanı</option>
            <option value="left">Sol</option>
            <option value="center">Orta</option>
            <option value="right">Sağ</option>
          </select>
        </label>

        <label className="block text-[11px] text-zinc-500">
          Font
          <select
            className={inputClass}
            value={v.fontPreset ?? "inherit"}
            onChange={(e) =>
              patch({ fontPreset: e.target.value as MirrorFontPreset })
            }
          >
            <option value="inherit">Tema varsayılanı</option>
            <option value="heading">Başlık fontu</option>
            <option value="accent">Vurgu fontu (italik)</option>
            <option value="body">Gövde fontu</option>
          </select>
        </label>

        <label className="block text-[11px] text-zinc-500">
          Yazı boyutu
          <select
            className={inputClass}
            value={v.fontSize ?? ""}
            onChange={(e) => patch({ fontSize: e.target.value || undefined })}
          >
            {FONT_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value || "default"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] text-zinc-500">
          Yazı rengi
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-10 shrink-0 cursor-pointer rounded border border-zinc-600 bg-zinc-950"
              value={v.color?.match(/^#[0-9a-fA-F]{6}$/) ? v.color : "#1a1a1a"}
              onChange={(e) => patch({ color: e.target.value })}
            />
            <input
              type="text"
              className={`${inputClass} mt-0 flex-1 font-mono text-xs`}
              placeholder="#000000"
              value={v.color ?? ""}
              onChange={(e) => {
                const c = e.target.value.trim();
                patch({ color: /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : undefined });
              }}
            />
            {v.color ? (
              <button
                type="button"
                className="shrink-0 text-[10px] text-zinc-500 underline"
                onClick={() => patch({ color: undefined })}
              >
                Temizle
              </button>
            ) : null}
          </div>
        </label>
      </div>
    </div>
  );
}
