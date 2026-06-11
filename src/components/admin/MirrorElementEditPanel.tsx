"use client";

import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { MirrorTypographyFields } from "@/components/admin/MirrorTypographyFields";
import {
  htmlToPlainText,
  markedHtmlToPlainText,
  marqueeEditToPlainText,
  marqueePlainToHtml,
  plainTextToMarkedHtml,
  plainTextToSimpleHtml,
} from "@/lib/html-plain-text";
import { PlainHtmlTextarea } from "@/components/admin/PlainHtmlTextarea";
import type { MirrorElementEdit, MirrorElementKind, MirrorElementPick } from "@/lib/mirror-element-edits";
import { isMirrorHeadingFieldId, isMirrorMarqueeFieldId } from "@/lib/mirror-element-typography";

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
  const accentMarked = isMirrorHeadingFieldId(pick.id);
  const outlineMarked = isMirrorMarqueeFieldId(pick.id);
  const rawValue =
    kind === "image"
      ? (edit?.imageUrl ?? pick.value)
      : kind === "link"
        ? (edit?.href ?? pick.value)
        : kind === "html"
          ? (edit?.html ?? pick.value)
          : (edit?.text ?? pick.value);

  const value =
    kind === "html"
      ? outlineMarked
        ? marqueeEditToPlainText(edit ?? { html: rawValue }, rawValue)
        : accentMarked
          ? markedHtmlToPlainText(rawValue)
          : htmlToPlainText(rawValue)
      : rawValue;

  function emitContent(next: string) {
    const base: MirrorElementEdit = {
      id: pick.id,
      kind,
      style: edit?.style,
    };
    if (kind === "image") onChange({ ...base, imageUrl: next });
    else if (kind === "link") onChange({ ...base, href: next });
    else if (kind === "html") {
      if (outlineMarked) {
        onChange({ ...base, text: next, html: marqueePlainToHtml(next) });
        return;
      }
      onChange({
        ...base,
        html: accentMarked ? plainTextToMarkedHtml(next) : plainTextToSimpleHtml(next),
      });
    } else onChange({ ...base, text: next });
  }

  const showTypography = kind === "html" || kind === "text";

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-rose-400">Seçili alan</p>
      <p className="mt-1 text-sm text-zinc-100">{KIND_LABELS[kind]}</p>
      <p className="mt-1 truncate text-xs text-zinc-500" title={pick.label}>
        {pick.label}
      </p>

      {kind === "image" ? (
        <div className="mt-3">
          <MirrorImageField label="Görsel" value={rawValue} onChange={(url) => emitContent(url)} />
        </div>
      ) : kind === "link" ? (
        <label className="mt-3 block text-xs text-zinc-400">
          Link URL
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={rawValue}
            onChange={(e) => emitContent(e.target.value)}
          />
        </label>
      ) : kind === "html" && outlineMarked ? (
        <label className="mt-3 block text-xs text-zinc-400">
          Metin
          <span className="mt-1 block text-[11px] font-normal text-zinc-600">
            Yalnızca indirim kodunu *yıldız* içine alın — örn. %20 indirim için *P-A-W-20* kodunu
            kullanabilirsiniz
          </span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            rows={8}
            value={value}
            onChange={(e) => emitContent(e.target.value)}
          />
        </label>
      ) : kind === "html" ? (
        <div className="mt-3">
          <PlainHtmlTextarea
            label="Metin"
            hint={
              accentMarked
                ? "Vurgulu kısım: *Yorumları* gibi yıldız içine alın"
                : "Enter ile yeni satır — HTML yazmayın"
            }
            rows={8}
            accentMarked={accentMarked}
            outlineMarked={false}
            valueHtml={rawValue}
            onChangeHtml={(html) => {
              if (accentMarked) {
                emitContent(markedHtmlToPlainText(html));
              } else {
                onChange({
                  id: pick.id,
                  kind,
                  style: edit?.style,
                  html,
                });
              }
            }}
          />
        </div>
      ) : (
        <label className="mt-3 block text-xs text-zinc-400">
          Metin
          <span className="mt-1 block text-[11px] font-normal text-zinc-600">
            Enter ile yeni satır — &lt;br /&gt; yazmayın
          </span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            rows={4}
            value={value}
            onChange={(e) => emitContent(e.target.value)}
          />
        </label>
      )}

      {showTypography ? (
        <MirrorTypographyFields
          value={edit?.style}
          onChange={(style) =>
            onChange({
              id: pick.id,
              kind,
              html: edit?.html ?? (kind === "html" ? pick.value : undefined),
              text: edit?.text ?? (outlineMarked ? value : kind === "text" ? pick.value : undefined),
              style,
            })
          }
        />
      ) : null}

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
