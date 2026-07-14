"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";

type PreviewPayload = {
  html?: string;
  source?: "local" | "gib";
  issued?: boolean;
  orderNumber?: string;
  grandTotalInclVAT?: number;
  invoiceStatus?: string | null;
  signed?: boolean;
};

const GIB_PORTAL_URL = "https://earsivportal.efatura.gov.tr/intragiris.html";

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
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/invoice/preview${q}`);
      const json = (await res.json().catch(() => ({}))) as { error?: string; preview?: PreviewPayload };
      if (!res.ok || !json.preview?.html) {
        setError(json.error ?? `Ön izleme yüklenemedi (sunucu ${res.status}).`);
        return;
      }
      setPreview(json.preview);
    } catch {
      setError("Ön izleme yüklenemedi — bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
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
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientTaxId: recipientTaxId.trim() || undefined,
          sendToMarketplace,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: { message: string };
      };
      if (!res.ok) {
        setMsg(
          json.error ??
            `Fatura kesilemedi (sunucu ${res.status}). GİB yanıt vermemiş olabilir; birkaç dakika sonra tekrar deneyin.`,
        );
        return;
      }
      setMsg(json.result?.message ?? "Fatura kesildi");
      onIssued?.();
      void loadPreview();
    } catch {
      setMsg("Bağlantı hatası — fatura kesilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIssuing(false);
    }
  }

  const isLocalDraft = preview?.source === "local" && !preview?.issued;
  // GİB'de taslak var ama henüz imzalanmadı → portalda SMS onayı bekliyor.
  const isUnsignedDraft = preview?.invoiceStatus === "draft" && preview?.signed !== true;
  const isFinalized =
    preview?.invoiceStatus === "signed" || preview?.invoiceStatus === "marketplace_sent";
  // Kesim/gönderim butonu: fatura kesilmemiş (taslak/none) olduğu sürece görünür.
  const showIssueButton = canIssue && !isFinalized && !loading && !error;
  const issueLabel = isUnsignedDraft ? "GİB'den onayı kontrol et ve gönder" : "Onayla ve GİB'e gönder";

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
          {isUnsignedDraft ? (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Taslak GİB'de oluştu ama imzalanmadı.</p>
              <p className="mt-1">
                Sunucuda e-imza cihazı olmadığından fatura otomatik imzalanamaz. Faturayı kesmek için:
              </p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>
                  <a
                    href={GIB_PORTAL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                  >
                    GİB e-Arşiv portalına
                  </a>{" "}
                  girin (giriş yaptıysanız bu ekranı kapatmaya gerek yok).
                </li>
                <li>Oluşturulan Belgeler → taslağı seçin → <b>SMS ile onayla</b> ile imzalayın.</li>
                <li>
                  Buraya dönüp <b>“{issueLabel}”</b> deyin — sistem imzalı fatura numarasını çekip
                  {marketplaceLabel && sendToMarketplace ? ` ${marketplaceLabel} pazaryerine gönderir.` : " kaydeder."}
                </li>
              </ol>
            </div>
          ) : isLocalDraft && canIssue ? (
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
            {showIssueButton ? (
              <button
                type="button"
                className={btnPrimary}
                disabled={issuing}
                onClick={() => void confirmAndIssue()}
              >
                {issuing ? "Gönderiliyor…" : issueLabel}
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
