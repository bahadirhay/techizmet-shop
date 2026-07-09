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

/** innerHTML script çalıştırmaz — iyzico checkoutFormContent için gerekli */
function mountHtmlWithScripts(host: HTMLElement, html: string) {
  host.innerHTML = html;
  host.querySelectorAll("script").forEach((old) => {
    const script = document.createElement("script");
    for (const attr of old.attributes) {
      script.setAttribute(attr.name, attr.value);
    }
    script.textContent = old.textContent;
    old.replaceWith(script);
  });
}

export function CardCheckout({
  orderNumber,
  paymentReference,
  paymentToken,
  failed,
  inline = false,
}: {
  orderNumber?: string;
  paymentReference?: string;
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
    const initKey = paymentReference ?? orderNumber;
    if (!initKey) return;

    fetch("/api/payments/card/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        paymentReference
          ? { reference: paymentReference, paymentToken }
          : { orderNumber, paymentToken },
      ),
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
          const pageUrl = j.paymentPageUrl?.trim();
          const formHtml = j.checkoutFormContent?.trim();
          if (pageUrl) {
            setIframeUrl(pageUrl);
            return;
          }
          if (formHtml) {
            setCheckoutHtml(formHtml);
            return;
          }
        }
        setErr("Ödeme başlatılamadı");
      })
      .catch(() => {
        setLoading(false);
        setErr("Bağlantı hatası");
      });
  }, [orderNumber, paymentReference, paymentToken]);

  useEffect(() => {
    if (checkoutHtml && formHostRef.current) {
      mountHtmlWithScripts(formHostRef.current, checkoutHtml);
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
        {orderNumber ? (
          <>
            Sipariş: <strong>{orderNumber}</strong>
          </>
        ) : (
          <>Güvenli kart ödemesi — bilgileriniz şifreli bağlantı ile işlenir.</>
        )}
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
