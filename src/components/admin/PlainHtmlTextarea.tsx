"use client";

import { htmlToPlainText, isComplexHtml, plainTextToSimpleHtml } from "@/lib/html-plain-text";

const areaClass =
  "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100";

export function PlainHtmlTextarea({
  label,
  hint,
  valueHtml,
  rows = 4,
  onChangeHtml,
}: {
  label: string;
  hint?: string;
  valueHtml: string;
  rows?: number;
  onChangeHtml: (html: string) => void;
}) {
  const complex = isComplexHtml(valueHtml);
  const plain = htmlToPlainText(valueHtml);

  const inner = (
    <>
      {label ? label : null}
      {hint ? <span className="mt-0.5 block font-normal text-zinc-600">{hint}</span> : null}
      {complex ? (
        <span className="mt-1 block text-[11px] text-amber-200/90">
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
        onChange={(e) => onChangeHtml(plainTextToSimpleHtml(e.target.value))}
      />
    </>
  );

  if (!label) return <div className="mt-1">{inner}</div>;

  return <label className="block text-xs text-zinc-400">{inner}</label>;
}
