"use client";

import {
  htmlToPlainText,
  isComplexHtml,
  markedHtmlToPlainText,
  plainTextToMarkedHtml,
  plainTextToOutlineMarkedHtml,
  plainTextToSimpleHtml,
} from "@/lib/html-plain-text";
import { inputClass } from "@/components/admin/AdminForm";

const darkAreaClass =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100";

const lightAreaClass = `${inputClass} mt-1 min-h-[72px] resize-y text-zinc-900`;

export function PlainHtmlTextarea({
  label,
  hint,
  valueHtml,
  rows = 4,
  accentMarked = false,
  outlineMarked = false,
  lightChrome = false,
  onChangeHtml,
}: {
  label: string;
  hint?: string;
  valueHtml: string;
  rows?: number;
  /** Başlık alanları — *vurgu* ile italik span korunur */
  accentMarked?: boolean;
  /** Kayan indirim şeridi — *vurgu* kontur (outline) stili */
  outlineMarked?: boolean;
  /** Açık admin formları (blog vb.) */
  lightChrome?: boolean;
  onChangeHtml: (html: string) => void;
}) {
  const marked = accentMarked || outlineMarked;
  const complex = !marked && isComplexHtml(valueHtml);
  const plain = marked ? markedHtmlToPlainText(valueHtml) : htmlToPlainText(valueHtml);
  const areaClass = lightChrome ? lightAreaClass : darkAreaClass;
  const labelClass = lightChrome ? "block text-sm font-medium text-zinc-700" : "block text-xs text-zinc-400";
  const hintTone = lightChrome ? "text-zinc-600" : "text-zinc-600";
  const complexTone = lightChrome ? "text-amber-800" : "text-amber-200/90";

  const inner = (
    <>
      {label ? label : null}
      {hint ? <span className={`mt-0.5 block font-normal ${hintTone}`}>{hint}</span> : null}
      {marked ? (
        <span className="mt-1 block text-[11px] text-zinc-500">
          {outlineMarked
            ? "Yalnızca indirim kodunu *yıldız* içine alın — örn. %20 indirim için *P-A-W-20* kodunu kullanabilirsiniz"
            : "Vurgulu kısım için *yıldız* kullanın — örn. Müşteri *Yorumları*"}
        </span>
      ) : complex ? (
        <span className={`mt-1 block text-[11px] ${complexTone}`}>
          Bu alanda vurgulu HTML var; aşağıdaki metin sadeleştirilmiş görünüm. Kaydedince yalnızca
          satır sonları korunur.
        </span>
      ) : (
        <span className="mt-1 block text-[11px] text-zinc-600">Enter = yeni satır (HTML kodu yazmayın)</span>
      )}
      <textarea
        className={areaClass}
        rows={rows}
        value={plain}
        onChange={(e) =>
          onChangeHtml(
            outlineMarked
              ? plainTextToOutlineMarkedHtml(e.target.value)
              : accentMarked
                ? plainTextToMarkedHtml(e.target.value)
                : plainTextToSimpleHtml(e.target.value),
          )
        }
      />
    </>
  );

  if (!label) return <div className="mt-1">{inner}</div>;

  return <label className={labelClass}>{inner}</label>;
}
