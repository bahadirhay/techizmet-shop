"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function OrderInvoicePdfPanel({
  orderId,
  orderNumber,
  customerEmail,
  lastSentAt,
  lastSentTo,
  lastSentFileName,
}: {
  orderId: string;
  orderNumber: string;
  /** Müşterinin kayıtlı e-postası — alan buradan doldurulur */
  customerEmail: string | null;
  /** Daha önce gönderildiyse — bilgi göstermek için */
  lastSentAt?: string | null;
  lastSentTo?: string | null;
  lastSentFileName?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(customerEmail?.trim() ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function send() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setIsError(true);
      setMsg("Önce GİB'den kestiğiniz PDF dosyasını seçin.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setIsError(false);

    const fd = new FormData();
    fd.append("file", file);
    if (email.trim()) fd.append("email", email.trim());

    const res = await fetch(`/api/admin/orders/${orderId}/invoice/send-pdf`, {
      method: "POST",
      body: fd,
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    setBusy(false);
    setIsError(!res.ok);
    setMsg(res.ok ? (json.message ?? "Fatura gönderildi.") : (json.error ?? "Gönderilemedi."));
    if (res.ok) {
      if (fileRef.current) fileRef.current.value = "";
      setFileName(null);
      router.refresh();
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <h2 className="font-semibold text-sky-950">Faturayı müşteriye gönder (PDF)</h2>
      <p className="mt-1 text-xs text-sky-900">
        GİB portalından elle kestiğiniz fatura PDF&apos;ini seçin; müşterinin kayıtlı e-postasına ek olarak
        gönderilir. Dosya sunucuda saklanmaz (arşiv GİB&apos;de tutulur).
      </p>

      {lastSentAt ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Son gönderim: {new Date(lastSentAt).toLocaleString("tr-TR")}
          {lastSentTo ? ` · ${lastSentTo}` : ""}
          {lastSentFileName ? ` · ${lastSentFileName}` : ""}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3">
        <AdminField label="Alıcı e-posta">
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
          />
        </AdminField>

        <div>
          <span className="mb-1 block text-sm font-medium text-sky-950">Fatura PDF</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-sm text-sky-950 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-700"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          {fileName ? (
            <p className="mt-1 text-xs text-sky-800">Seçilen: {fileName}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void send()}>
          {busy ? "Gönderiliyor…" : "PDF'i müşteriye e-posta gönder"}
        </button>
      </div>

      {msg ? (
        <p className={`mt-2 text-sm ${isError ? "text-red-700" : "text-emerald-800"}`}>{msg}</p>
      ) : null}
      <p className="mt-3 text-xs text-sky-800">Sipariş: {orderNumber}</p>
    </div>
  );
}
