"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart/CartContext";
import { formatTry } from "@/lib/format";

export function MiniCart() {
  const { cart, isOpen, closeCart, setQty, removeItem, loading } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const items = cart?.items ?? [];

  return (
    <>
      <button type="button" className="kn-cart-overlay" aria-label="Sepeti kapat" onClick={closeCart} />
      <aside className="kn-mini-cart" role="dialog" aria-label="Sepet">
        <div className="kn-mini-cart__head">
          <h2>Sepetim {cart ? `(${cart.itemCount})` : ""}</h2>
          <button type="button" className="kn-mini-cart__close" onClick={closeCart} aria-label="Kapat">
            ×
          </button>
        </div>
        <div className="kn-mini-cart__body">
          {loading ? (
            <p className="kn-mini-cart__empty">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <p className="kn-mini-cart__empty">Sepetiniz boş.</p>
          ) : (
            <ul className="kn-mini-cart__list">
              {items.map((line) => (
                <li key={`${line.productId}:${line.variantId ?? ""}`} className="kn-mini-cart__item">
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.imageUrl} alt="" className="kn-mini-cart__thumb" />
                  ) : (
                    <div className="kn-mini-cart__thumb kn-mini-cart__thumb--ph" />
                  )}
                  <div className="kn-mini-cart__info">
                    <Link href={`/products/${line.slug}`} onClick={closeCart} className="kn-mini-cart__title">
                      {line.title}
                    </Link>
                    <p className="kn-mini-cart__price">
                      {line.discountMinor > 0 ? formatTry(line.lineTotalMinor) : formatTry(line.lineMinor)}
                    </p>
                    <div className="kn-mini-cart__qty">
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
                      <button
                        type="button"
                        className="kn-mini-cart__remove"
                        onClick={() => removeItem(line.productId, line.variantId)}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {cart && items.length > 0 ? (
          <div className="kn-mini-cart__foot">
            {cart.discountMinor > 0 ? (
              <p className="kn-mini-cart__row">
                <span>İndirim</span>
                <span>−{formatTry(cart.discountMinor)}</span>
              </p>
            ) : null}
            <p className="kn-mini-cart__total">
              <span>Ara toplam</span>
              <strong>{formatTry(cart.totalMinor)}</strong>
            </p>
            <Link href="/cart" className="kn-btn kn-btn--outline kn-btn--block" onClick={closeCart}>
              Sepeti görüntüle
            </Link>
            <Link href="/checkout" className="kn-btn kn-btn--primary kn-btn--block" onClick={closeCart}>
              Ödemeye geç
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function CartTrigger() {
  const { cart, openCart } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <button type="button" className="kn-cart-trigger" onClick={openCart}>
      Sepet ({count})
    </button>
  );
}
