"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PublicOrderView } from "@/lib/orders/public-order";

export function OrderTrackForm() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrderView | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOrder(null);
    const res = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, email }),
    });
    const json = (await res.json()) as { error?: string; order?: PublicOrderView };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Sorgu başarısız");
      return;
    }
    setOrder(json.order ?? null);
  }

  return (
    <div className="kn-account">
      <h1>Sipariş takip</h1>
      <p className="kn-account__lead">Sipariş numaranız ve checkout&apos;ta kullandığınız e-posta ile sorgulayın.</p>
      <form className="kn-account__form" onSubmit={submit}>
        <label>
          Sipariş numarası
          <input
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="SHOP-20260521-XXXX"
          />
        </label>
        <label>
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary" disabled={busy}>
          {busy ? "Aranıyor…" : "Siparişi göster"}
        </button>
      </form>

      {order ? (
        <div className="kn-order-track-result">
          <h2>Sipariş {order.orderNumber}</h2>
          <dl className="kn-order-track-meta">
            <div>
              <dt>Durum</dt>
              <dd>{order.statusLabel}</dd>
            </div>
            <div>
              <dt>Ödeme</dt>
              <dd>
                {order.paymentStatusLabel} · {order.paymentMethodLabel}
              </dd>
            </div>
            <div>
              <dt>Tarih</dt>
              <dd>{new Date(order.createdAt).toLocaleString("tr-TR")}</dd>
            </div>
            {order.carrierName ? (
              <div>
                <dt>Kargo</dt>
                <dd>
                  {order.carrierName}
                  {order.trackingNumber ? ` · Takip: ${order.trackingNumber}` : null}
                </dd>
              </div>
            ) : null}
          </dl>
          <ul className="kn-order-track-lines">
            {order.lines.map((l, i) => (
              <li key={i}>
                <span>
                  {l.title} × {l.qty}
                </span>
                <span>{l.lineFormatted}</span>
              </li>
            ))}
          </ul>
          <p className="kn-order-track-total">
            <strong>Toplam: {order.totalFormatted}</strong>
          </p>
          <Link href="/account/login" className="kn-btn kn-btn--outline">
            Hesabıma giriş yap
          </Link>
        </div>
      ) : null}
    </div>
  );
}
