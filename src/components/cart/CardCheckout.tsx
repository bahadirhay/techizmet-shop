"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CardInitResponse = {
  provider?: "paytr" | "iyzico";
  iframeUrl?: string;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
  testMode?: boolean;
  error?: string;
};

export function CardCheckout({
  orderNumber,
  paymentToken,
  failed,
  inline = false,
}: {
  orderNumber: string;
  paymentToken: string;
  failed?: boolean;
  /** Checkout sayfasında gömülü — ayrı sayfa başlığı yok */
  inline?: boolean;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [cardTestMode, setCardTestMode] = useState(false);
  const [err, setErr] = useState<string | null>(failed ? "Ödeme tamamlanamadı. Tekrar deneyin." : null);
  const [loading, setLoading] = useState(true);
  const formHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/payments/card/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, paymentToken }),
    })
      .then((r) => r.json())
      .then((j: CardInitResponse) => {
        setLoading(false);
        setCardTestMode(Boolean(j.testMode));
        setProvider(j.provider ?? null);
        if (j.error) {
          setErr(j.error);
          return;
        }
        if (j.provider === "paytr" && j.iframeUrl) {
          setIframeUrl(j.iframeUrl);
          return;
        }
        if (j.provider === "iyzico") {
          if (j.checkoutFormContent) {
            setCheckoutHtml(j.checkoutFormContent);
            return;
          }
          if (j.paymentPageUrl) {
            setIframeUrl(j.paymentPageUrl);
            return;
          }
        }
        setErr("Ödeme başlatılamadı");
      })
      .catch(() => {
        setLoading(false);
        setErr("Bağlantı hatası");
      });
  }, [orderNumber, paymentToken]);

  useEffect(() => {
    if (checkoutHtml && formHostRef.current) {
      formHostRef.current.innerHTML = checkoutHtml;
    }
  }, [checkoutHtml]);

  const providerLabel = provider === "iyzico" ? "iyzico" : provider === "paytr" ? "PayTR" : "kart";

  return (
    <div className={`kn-section kn-paytr${inline ? " kn-paytr--inline" : ""}`} id="kn-inline-card-pay">
      {inline ? (
        <h3 className="kn-paytr__inline-title">Kart ile ödeme</h3>
      ) : (
        <h1>Kart ile ödeme</h1>
      )}
      <p className="kn-paytr__order">
        Sipariş: <strong>{orderNumber}</strong>
      </p>
      {cardTestMode ? (
        <p className="kn-paytr-test-notice" role="status">
          {providerLabel} test modu — gerçek tahsilat yapılmaz.
        </p>
      ) : null}
      {loading ? <p>Güvenli ödeme yükleniyor…</p> : null}
      {err ? (
        <div className="kn-alert kn-alert--warn">
          <p>{err}</p>
          {!inline ? (
            <Link href="/checkout" className="kn-btn kn-btn--outline">
              Checkout&apos;a dön
            </Link>
          ) : null}
        </div>
      ) : null}
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          title={`${providerLabel} ödeme`}
          className="kn-paytr__iframe"
          style={{ width: "100%", minHeight: "520px", border: "none" }}
        />
      ) : null}
      <div ref={formHostRef} />
    </div>
  );
}
