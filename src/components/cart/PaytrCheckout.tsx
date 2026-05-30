"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function PaytrCheckout({
  orderNumber,
  failed,
}: {
  orderNumber: string;
  failed?: boolean;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(failed ? "Ödeme tamamlanamadı. Tekrar deneyin." : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments/paytr/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    })
      .then((r) => r.json())
      .then((j: { iframeUrl?: string; error?: string }) => {
        setLoading(false);
        if (j.iframeUrl) setIframeUrl(j.iframeUrl);
        else setErr(j.error ?? "Ödeme başlatılamadı");
      })
      .catch(() => {
        setLoading(false);
        setErr("Bağlantı hatası");
      });
  }, [orderNumber]);

  return (
    <div className="kn-section kn-paytr">
      <h1>Kart ile ödeme</h1>
      <p className="kn-paytr__order">
        Sipariş: <strong>{orderNumber}</strong>
      </p>
      {loading ? <p>PayTR güvenli ödeme yükleniyor…</p> : null}
      {err ? (
        <div className="kn-alert kn-alert--warn">
          <p>{err}</p>
          <Link href="/checkout" className="kn-btn kn-btn--outline">
            Checkout&apos;a dön
          </Link>
        </div>
      ) : null}
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          title="PayTR ödeme"
          className="kn-paytr__iframe"
          style={{ width: "100%", minHeight: "520px", border: "none" }}
        />
      ) : null}
    </div>
  );
}
