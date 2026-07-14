"use client";

import { useEffect, useRef, useState } from "react";
import { isOrderInvoiceComplete } from "@/lib/admin/order-invoice-workflow";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { InvoicePreviewModal } from "@/components/admin/InvoicePreviewModal";

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  signed: "İmzalandı",
  marketplace_sent: "Pazaryerine iletildi",
};

export function OrderInvoicePanel({
  orderId,
  orderNumber,
  orderStatus,
  marketplacePlatform,
  invoiceStatus,
  invoiceNumber,
  invoiceLink,
  invoiceIssuedAt,
  efaturaEnabled,
  efaturaReady,
  focusInvoice = false,
  defaultRecipientTaxId,
}: {
  orderId: string;
  orderNumber: string;
  /** Sipariş durumu — iptal/iade siparişlerde fatura kesimi gösterilmez */
  orderStatus: string;
  marketplacePlatform: string | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
  invoiceLink: string | null;
  invoiceIssuedAt: Date | null;
  /** Ayarlarda entegrasyon açık mı */
  efaturaEnabled: boolean;
  /** GİB kullanıcı + parola tamam mı (kesim için) */
  efaturaReady: boolean;
  /** Kargo kaydı sonrası — panele kaydır ve ön izlemeyi aç */
  focusInvoice?: boolean;
  /** Siparişteki TCKN/VKN — fatura ön izlemesine önceden doldurulur */
  defaultRecipientTaxId?: string | null;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [recipientTaxId, setRecipientTaxId] = useState(defaultRecipientTaxId ?? "");
  const [sendToMarketplace, setSendToMarketplace] = useState(Boolean(marketplacePlatform));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [highlight, setHighlight] = useState(false);

  async function resendMarketplace() {
    if (!invoiceLink) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}/marketplace/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceLink, invoiceNumber: invoiceNumber ?? undefined }),
    });
    const json = (await res.json()) as { error?: string; result?: { message: string } };
    setBusy(false);
    setMsg(res.ok ? (json.result?.message ?? "Pazaryerine gönderildi") : (json.error ?? "Hata"));
    if (res.ok) router.refresh();
  }

  const hasInvoice = Boolean(invoiceStatus && invoiceStatus !== "none");
  const orderCancelled = ["cancelled", "refunded", "refund_requested"].includes(orderStatus);
  const canIssueNew = efaturaReady && !orderCancelled && (!hasInvoice || invoiceStatus === "draft");
  const invoiceComplete = isOrderInvoiceComplete(invoiceStatus);

  useEffect(() => {
    if (!focusInvoice || orderCancelled) return;
    const el = panelRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(true);
    const t = window.setTimeout(() => setHighlight(false), 2400);
    if (!invoiceComplete && canIssueNew) {
      setPreviewOpen(true);
    }
    return () => window.clearTimeout(t);
  }, [focusInvoice, invoiceComplete, canIssueNew, orderCancelled]);

  // İptal / iade edilmiş ve faturası olmayan siparişte fatura kesimi gösterme.
  if (orderCancelled && !hasInvoice) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="font-semibold text-zinc-700">e-Arşiv fatura</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Bu sipariş iptal/iade edildiği için fatura kesilmesi gerekmez.
        </p>
      </div>
    );
  }

  return (
    <div
      id="kn-order-invoice"
      ref={panelRef}
      className={`mt-6 scroll-mt-24 rounded-xl border p-4 transition-shadow ${
        highlight
          ? "border-[var(--kn-brand)] bg-emerald-50 ring-2 ring-[var(--kn-brand)]/40"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <h2 className="font-semibold text-emerald-950">e-Arşiv fatura</h2>
      <p className="mt-1 text-xs text-emerald-900">
        Önce ön izlemede kontrol edin; GİB bağlantısı hazırsa onaylayıp gönderin veya yazdırın.
      </p>

      {!efaturaEnabled ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          GİB entegrasyonu kapalı — yalnızca yerel ön izleme kullanılabilir. Kesmek için{" "}
          <a href="/admin/settings/efatura" className="font-medium text-[var(--kn-brand)] underline">
            Ayarlar → GİB e-Fatura
          </a>{" "}
          bölümünden etkinleştirin.
        </p>
      ) : !efaturaReady ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          GİB kullanıcı kodu veya parola eksik — ön izleme açık, kesim için ayarları tamamlayın.
        </p>
      ) : null}

      {hasInvoice ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm">
          <p>
            <span className="font-medium">Durum:</span>{" "}
            {STATUS_LABELS[invoiceStatus ?? ""] ?? invoiceStatus}
          </p>
          {invoiceNumber ? (
            <p className="mt-1">
              <span className="font-medium">Fatura no:</span> {invoiceNumber}
            </p>
          ) : null}
          {invoiceIssuedAt ? (
            <p className="mt-1 text-zinc-600">
              {new Date(invoiceIssuedAt).toLocaleString("tr-TR")}
            </p>
          ) : null}
          {invoiceLink ? (
            <p className="mt-2">
              <a href={invoiceLink} target="_blank" rel="noreferrer" className="text-[var(--kn-brand)] underline">
                Müşteri / pazaryeri fatura linki →
              </a>
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <AdminField label="Alıcı VKN/TCKN (isteğe bağlı)">
            <input
              className={inputClass}
              value={recipientTaxId}
              onChange={(e) => setRecipientTaxId(e.target.value)}
              placeholder="Boş bırakılırsa B2C varsayılan TCKN kullanılır"
            />
          </AdminField>
          {marketplacePlatform && efaturaReady ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-emerald-950">
              <input
                type="checkbox"
                checked={sendToMarketplace}
                onChange={(e) => setSendToMarketplace(e.target.checked)}
              />
              Kesim sonrası {marketplacePlatform} pazaryerine otomatik gönder
            </label>
          ) : null}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => setPreviewOpen(true)}
        >
          {hasInvoice ? "Faturayı görüntüle / yazdır" : "Fatura ön izlemesi"}
        </button>
        <a
          href="/admin/settings/efatura"
          className={`${btnSecondary} inline-flex items-center`}
        >
          e-Fatura ayarları
        </a>
      </div>

      {hasInvoice && marketplacePlatform ? (
        <div className="mt-3">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => void resendMarketplace()}
          >
            Pazaryerine tekrar gönder
          </button>
        </div>
      ) : null}

      {msg ? <p className="mt-2 text-sm text-emerald-950">{msg}</p> : null}
      <p className="mt-3 text-xs text-emerald-800">
        Sipariş: {orderNumber} · Fiyatlar KDV dahil kabul edilir.
      </p>

      {previewOpen ? (
        <InvoicePreviewModal
          orderId={orderId}
          orderNumber={orderNumber}
          recipientTaxId={recipientTaxId}
          sendToMarketplace={sendToMarketplace}
          canIssue={canIssueNew}
          gibNotReadyMessage={
            !efaturaReady
              ? "GİB'e göndermek için Ayarlar → GİB e-Fatura bölümünde entegrasyonu açın ve kullanıcı kodu ile parolayı kaydedin."
              : undefined
          }
          marketplaceLabel={marketplacePlatform ?? undefined}
          onClose={() => setPreviewOpen(false)}
          onIssued={() => {
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
