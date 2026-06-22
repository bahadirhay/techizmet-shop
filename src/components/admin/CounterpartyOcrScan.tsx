"use client";

import { useRef, useState } from "react";
import { btnSecondary } from "@/components/admin/AdminForm";
import {
  parseCounterpartyOcrText,
  type CounterpartyOcrFields,
} from "@/lib/finance/parse-counterparty-ocr";

type Props = {
  onResult: (fields: CounterpartyOcrFields) => void;
  disabled?: boolean;
};

function fieldLabels(fields: CounterpartyOcrFields): string {
  const parts: string[] = [];
  if (fields.title) parts.push("ünvan");
  if (fields.taxId) parts.push("VKN/TCKN");
  if (fields.taxOffice) parts.push("vergi dairesi");
  if (fields.addressLine || fields.city || fields.district) parts.push("adres");
  if (fields.email) parts.push("e-posta");
  if (fields.phone) parts.push("telefon");
  return parts.join(", ");
}

export function CounterpartyOcrScan({ onResult, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file || disabled || busy) return;
    setBusy(true);
    setProgress(0);
    setMsg("Belge okunuyor… İlk kullanımda dil paketi indirilebilir.");
    setErr(null);

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("tur", 1, {
        logger: (event) => {
          if (event.status === "recognizing text" && typeof event.progress === "number") {
            setProgress(Math.round(event.progress * 100));
          }
        },
      });

      try {
        const { data } = await worker.recognize(file);
        const fields = parseCounterpartyOcrText(data.text ?? "");
        const found = fieldLabels(fields);
        if (!found) {
          setErr("Metin okundu ancak cari bilgisi bulunamadı. Belgeyi net çekip tekrar deneyin.");
          setMsg(null);
          return;
        }
        onResult(fields);
        setMsg(`Alanlar dolduruldu: ${found}.`);
      } finally {
        await worker.terminate();
      }
    } catch {
      setErr("Belge okunamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
      setMsg(null);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnSecondary}
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? `Okunuyor… %${progress}` : "Kamera ile oku"}
        </button>
        <button
          type="button"
          className="text-sm text-[var(--kn-brand)] underline disabled:opacity-50"
          disabled={disabled || busy}
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
              inputRef.current.setAttribute("capture", "environment");
            }
          }}
        >
          Galeriden seç
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <p className="mt-2 text-xs text-zinc-500">
        Vergi levhası, fatura veya antetli kağıdı çekin; ünvan, VKN/TCKN, vergi dairesi ve adres
        alanları otomatik dolar.
      </p>
      {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
