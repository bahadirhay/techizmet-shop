"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { formatTry } from "@/lib/format";

export function CartPageClient() {
  const { cart, loading, setQty, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState(cart?.couponCode ?? "");

  if (loading || !cart) {
    return <p className="kn-cart-page__loading">Sepet yükleniyor…</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="kn-cart-page kn-cart-page--empty">
        <h1>Sepetiniz boş</h1>
        <p>Alışverişe devam etmek için koleksiyonlara göz atın.</p>
        <Link href="/collections/all" className="kn-btn kn-btn--primary">
          Ürünlere git
        </Link>
      </div>
    );
  }

  return (
    <div className="kn-cart-page">
      <h1>Sepet ({cart.itemCount} ürün)</h1>
      {cart.memberGroupName && cart.memberDiscountPercent > 0 ? (
        <p className="kn-cart-member-note">
          {cart.memberGroupName} üyesi olarak satış fiyatı üzerinden %{cart.memberDiscountPercent}{" "}
          indirim uygulandı.
        </p>
      ) : null}
      {cart.errors.length > 0 ? (
        <div className="kn-alert kn-alert--warn">
          {cart.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}
      <div className="kn-cart-page__grid">
        <div className="kn-cart-page__lines">
          {cart.items.map((line) => (
            <article
              key={`${line.productId}:${line.variantId ?? ""}`}
              className="kn-cart-line"
            >
              {line.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.imageUrl} alt="" className="kn-cart-line__img" />
              ) : (
                <div className="kn-cart-line__img kn-cart-line__img--ph" />
              )}
              <div className="kn-cart-line__body">
                <Link href={`/products/${line.slug}`} className="kn-cart-line__title">
                  {line.title}
                </Link>
                <p className="kn-cart-line__unit">{formatTry(line.unitMinor)} / adet</p>
                <div className="kn-qty-picker">
                  <button
                    type="button"
                    onClick={() => setQty(line.productId, line.qty - 1, line.variantId)}
                  >
                    −
                  </button>
                  <span>{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(line.productId, line.qty + 1, line.variantId)}
                    disabled={line.qty >= line.maxQty}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="kn-cart-line__remove"
                  onClick={() => removeItem(line.productId, line.variantId)}
                >
                  Kaldır
                </button>
              </div>
              <p className="kn-cart-line__total">
                {line.discountMinor > 0 ? (
                  <>
                    <span className="kn-cart-line__was">{formatTry(line.lineMinor)}</span>{" "}
                    {formatTry(line.lineTotalMinor)}
                  </>
                ) : (
                  formatTry(line.lineMinor)
                )}
              </p>
            </article>
          ))}
        </div>
        <aside className="kn-cart-summary">
          <h2>Sipariş özeti</h2>
          {!cart.freeShipping &&
          cart.freeShippingThresholdMinor > 0 &&
          cart.freeShippingRemainingMinor > 0 ? (
            <div className="kn-free-shipping-bar">
              <p>
                Ücretsiz kargo için{" "}
                <strong>{formatTry(cart.freeShippingRemainingMinor)}</strong> daha ekleyin (
                {formatTry(cart.freeShippingThresholdMinor)} ve üzeri)
              </p>
              <div className="kn-free-shipping-bar__track">
                <div
                  className="kn-free-shipping-bar__fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((cart.freeShippingThresholdMinor - cart.freeShippingRemainingMinor) /
                          cart.freeShippingThresholdMinor) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : cart.freeShipping ? (
            <p className="kn-text-success kn-free-shipping-bar kn-free-shipping-bar--ok">
              Bu siparişte kargo ücretsiz
            </p>
          ) : null}
          <div className="kn-cart-summary__coupon">
            <label>
              Kupon kodu
              <div className="kn-cart-summary__coupon-row">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="KUPON"
                />
                <button type="button" className="kn-btn kn-btn--outline" onClick={() => applyCoupon(couponInput)}>
                  Uygula
                </button>
              </div>
            </label>
            {cart.couponCode ? (
              <button type="button" className="kn-cart-summary__remove-coupon" onClick={removeCoupon}>
                Kuponu kaldır ({cart.couponCode})
              </button>
            ) : null}
            {cart.couponLabel ? (
              <p className="kn-cart-summary__coupon-ok">
                {cart.couponLabel}
                {cart.couponCode ? ` (${cart.couponCode})` : ""}
              </p>
            ) : null}
          </div>
          <dl className="kn-cart-summary__rows">
            <div>
              <dt>Ara toplam</dt>
              <dd>{formatTry(cart.subtotalMinor)}</dd>
            </div>
            {cart.discountMinor > 0 ? (
              <div>
                <dt>İndirim</dt>
                <dd>−{formatTry(cart.discountMinor)}</dd>
              </div>
            ) : null}
            {cart.freeShipping ? (
              <div>
                <dt>Kargo</dt>
                <dd className="kn-text-success">Ücretsiz</dd>
              </div>
            ) : null}
            <div className="kn-cart-summary__total">
              <dt>Toplam (kargo hariç)</dt>
              <dd>{formatTry(cart.totalMinor)}</dd>
            </div>
          </dl>
          <p className="kn-cart-summary__note">Kargo ücreti ödeme adımında hesaplanır.</p>
          <Link href="/checkout" className="kn-btn kn-btn--primary kn-btn--block">
            Ödemeye geç
          </Link>
          <Link href="/collections/all" className="kn-btn kn-btn--outline kn-btn--block">
            Alışverişe devam
          </Link>
        </aside>
      </div>
    </div>
  );
}
