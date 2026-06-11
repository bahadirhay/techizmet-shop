"use client";

import { useState } from "react";
import { MirrorTypographyFields } from "@/components/admin/MirrorTypographyFields";
import { PlainHtmlTextarea } from "@/components/admin/PlainHtmlTextarea";
import type { EditableFieldDef } from "@/lib/mirror-editable-catalog";
import type { MirrorElementEdit } from "@/lib/mirror-element-edits";
import { resolveMirrorElementEdit } from "@/lib/mirror-element-edits";

export function SectionHeadingFieldBlock({
  field,
  sectionLabel,
  sectionEdit,
  elements,
  onPatchElement,
}: {
  field: EditableFieldDef;
  sectionLabel: string;
  sectionEdit?: { headingHtml?: string };
  elements: Record<string, MirrorElementEdit> | undefined;
  onPatchElement: (edit: MirrorElementEdit) => void;
}) {
  const edit = resolveMirrorElementEdit(field.id, elements);
  const valueTr = edit?.html ?? sectionEdit?.headingHtml ?? field.defaultValue;
  const valueEn = edit?.htmlEn ?? "";

  const [tab, setTab] = useState<"tr" | "en">("tr");

  function patch(partial: Partial<MirrorElementEdit>) {
    onPatchElement({
      id: field.id,
      kind: field.kind,
      html: partial.html !== undefined ? partial.html : (edit?.html ?? (field.kind === "html" ? field.defaultValue : undefined)),
      htmlEn: partial.htmlEn !== undefined ? partial.htmlEn : edit?.htmlEn,
      text: partial.text ?? edit?.text,
      style: partial.style !== undefined ? partial.style : edit?.style,
    });
  }

  const title =
    sectionLabel.toLowerCase().includes("yorum") || sectionLabel.toLowerCase().includes("testimonial")
      ? "Müşteri Yorumları — bölüm başlığı"
      : "Bölüm başlığı";

  return (
    <div className="space-y-2 rounded-lg border border-sky-500/40 bg-sky-950/20 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">{title}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab("tr")}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${tab === "tr" ? "bg-sky-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            🇹🇷 TR
          </button>
          <button
            type="button"
            onClick={() => setTab("en")}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${tab === "en" ? "bg-sky-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            🇬🇧 EN
          </button>
        </div>
      </div>
      {tab === "tr" ? (
        <>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Türkçe başlık ({sectionLabel}). Vurgulu kelime için *yıldız* kullanın — örn.{" "}
            <span className="text-zinc-300">Müşteri *Yorumları*</span>
          </p>
          <PlainHtmlTextarea
            label=""
            hint={field.hint}
            rows={3}
            accentMarked
            valueHtml={valueTr}
            onChangeHtml={(html) => patch({ html })}
          />
        </>
      ) : (
        <>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            İngilizce başlık — boş bırakılırsa EN vitrin orijinal şablon metni gösterir.
          </p>
          <PlainHtmlTextarea
            label=""
            hint={field.hint}
            rows={3}
            accentMarked
            valueHtml={valueEn}
            onChangeHtml={(html) => patch({ htmlEn: html })}
          />
        </>
      )}
      <MirrorTypographyFields
        compact
        value={edit?.style}
        onChange={(style) => patch({ style })}
      />
    </div>
  );
}
