"use client";

import {
  formatShipFromLines,
  formatShippingAddressLines,
  paymentMethodShort,
  type ShipFromAddress,
  type ShippingLabelData,
} from "@/lib/admin/shipping-label";

export function ShippingLabelSheet({
  label,
  shipFrom,
  size = "standard",
}: {
  label: ShippingLabelData;
  shipFrom: ShipFromAddress;
  size?: "standard" | "compact";
}) {
  const toLines = formatShippingAddressLines(label.shippingAddress);
  const fromLines = formatShipFromLines(shipFrom);

  return (
    <article
      className={`shipping-label ${size === "compact" ? "shipping-label--compact" : ""}`}
      data-order={label.orderNumber}
    >
      <header className="shipping-label__header">
        <div>
          <p className="shipping-label__brand">{shipFrom.name}</p>
          <p className="shipping-label__meta">
            {label.sourceLabel} · {label.orderDate}
          </p>
        </div>
        <div className="shipping-label__order-no">{label.orderNumber}</div>
      </header>

      <section className="shipping-label__block">
        <p className="shipping-label__label">Gönderici</p>
        <p className="shipping-label__name">{shipFrom.name}</p>
        {fromLines.length ? (
          <p className="shipping-label__address">{fromLines.join("\n")}</p>
        ) : (
          <p className="shipping-label__address shipping-label__muted">Gönderici adresi girilmedi</p>
        )}
      </section>

      <section className="shipping-label__block shipping-label__block--recipient">
        <p className="shipping-label__label">Alıcı</p>
        <p className="shipping-label__name">{label.customerName}</p>
        {label.customerPhone ? (
          <p className="shipping-label__phone">{label.customerPhone}</p>
        ) : null}
        {toLines.length ? (
          <p className="shipping-label__address">{toLines.join("\n")}</p>
        ) : (
          <p className="shipping-label__address shipping-label__muted">Adres kaydı yok</p>
        )}
      </section>

      <section className="shipping-label__footer">
        <div className="shipping-label__row">
          <span>Kargo</span>
          <strong>{label.carrierName ?? "—"}</strong>
        </div>
        {label.trackingNumber ? (
          <div className="shipping-label__tracking">
            <span>Takip no</span>
            <strong>{label.trackingNumber}</strong>
          </div>
        ) : null}
        <div className="shipping-label__row">
          <span>Ödeme</span>
          <strong>{paymentMethodShort(label.paymentMethod)}</strong>
        </div>
        <div className="shipping-label__row">
          <span>İçerik</span>
          <strong>
            {label.totalPieces} adet · {label.itemCount} kalem
          </strong>
        </div>
        {label.itemSummary ? <p className="shipping-label__items">{label.itemSummary}</p> : null}
        {label.isMarketplace ? (
          <p className="shipping-label__badge">Pazaryeri siparişi — platform dışı iletişim yasaktır</p>
        ) : null}
      </section>
    </article>
  );
}
