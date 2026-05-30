"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";

type PreviewPayload = {
  html?: string;
  source?: "local" | "gib";
  issued?: boolean;
  orderNumber?: string;
  grandTotalInclVAT?: number;
};

export function InvoicePreviewModal({
  orderId,
  orderNumber,
  recipientTaxId,
  sendToMarketplace,
  canIssue,
  gibNotReadyMessage,
  marketplaceLabel,
  onClose,
  onIssued,
}: {
  orderId: string;
  orderNumber: string;
  recipientTaxId: string;
  sendToMarketplace: boolean;
  /** false = yalnızca görüntüle / yazdır */
  canIssue: boolean;
  gibNotReadyMessage?: string;
  marketplaceLabel?: string;
  onClose: () => void;
  onIssued?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = recipientTaxId.trim() ? `?recipientTaxId=${encodeURIComponent(recipientTaxId.trim())}` : "";
    const res = await fetch(`/api/admin/orders/${orderId}/invoice/preview${q}`);
    const json = (await res.json()) as { error?: string; preview?: PreviewPayload };
    setLoading(false);
    if (!res.ok || !json.preview?.html) {
      setError(json.error ?? "Ön izleme yüklenemedi");
      return;
    }
    setPreview(json.preview);
  }, [orderId, recipientTaxId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (!preview?.html || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(preview.html);
    doc.close();
  }, [preview?.html]);

  function printPreview() {
    const win = iframeRef.current?.contentWindow;
    if (win) win.print();
  }

  async function confirmAndIssue() {
    setIssuing(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientTaxId: recipientTaxId.trim() || undefined,
        sendToMarketplace,
      }),
    });
    const json = (await res.json()) as { error?: string; result?: { message: string } };
    setIssuing(false);
    if (!res.ok) {
      setMsg(json.error ?? "Fatura kesilemedi");
      return;
    }
    setMsg(json.result?.message ?? "Fatura kesildi");
    onIssued?.();
    void loadPreview();
  }

  const isLocalDraft = preview?.source === "local" && !preview?.issued;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-preview-title"
    >
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id="invoice-preview-title" className="text-lg font-semibold">
              Fatura ön izlemesi
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Sipariş {orderNumber}
              {preview?.source === "gib" ? " · GİB kayıtlı fatura" : isLocalDraft ? " · Kesim öncesi kontrol" : ""}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-zinc-100 p-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-zinc-600">Ön izleme hazırlanıyor…</p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-red-700">{error}</p>
          ) : (
            <iframe
              ref={iframeRef}
              title="Fatura ön izlemesi"
              className="h-[min(60vh,520px)] w-full rounded-lg border border-zinc-200 bg-white"
              sandbox="allow-same-origin allow-modals"
            />
          )}
        </div>

        <div className="border-t border-zinc-200 px-5 py-4">
          {isLocalDraft && canIssue ? (
            <p className="mb-3 text-sm text-zinc-600">
              Bilgileri kontrol edin. Onayladığınızda fatura GİB e-Arşiv portalına gönderilir
              {marketplaceLabel && sendToMarketplace ? ` ve ${marketplaceLabel} pazaryerine iletilir` : ""}.
            </p>
          ) : isLocalDraft && gibNotReadyMessage ? (
            <p className="mb-3 text-sm text-amber-800">{gibNotReadyMessage}</p>
          ) : null}

          {msg ? <p className="mb-3 text-sm text-emerald-800">{msg}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={loading || Boolean(error)}
              onClick={printPreview}
            >
              Yazdır
            </button>
            {isLocalDraft && canIssue ? (
              <button
                type="button"
                className={btnPrimary}
                disabled={loading || Boolean(error) || issuing}
                onClick={() => void confirmAndIssue()}
              >
                {issuing ? "Gönderiliyor…" : "Onayla ve GİB'e gönder"}
              </button>
            ) : null}
            <button type="button" className={btnSecondary} onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
