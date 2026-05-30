"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";

export function AddToCartButton({
  productId,
  variantId,
  disabled,
  maxQty,
}: {
  productId: string;
  variantId?: string | null;
  disabled?: boolean;
  maxQty: number;
}) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAdd() {
    setBusy(true);
    setErr(null);
    const r = await addItem(productId, qty, variantId);
    setBusy(false);
    if (!r.ok) setErr(r.error ?? "Hata");
  }

  return (
    <div className="kn-add-to-cart">
      <div className="kn-qty-picker">
        <button type="button" aria-label="Azalt" onClick={() => setQty((q) => Math.max(1, q - 1))}>
          −
        </button>
        <span>{qty}</span>
        <button
          type="button"
          aria-label="Artır"
          onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
          disabled={qty >= maxQty}
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="kn-btn kn-btn--primary kn-btn--block"
        disabled={disabled || busy}
        onClick={handleAdd}
      >
        {busy ? "Ekleniyor…" : "Sepete ekle"}
      </button>
      {err ? <p className="kn-add-to-cart__err">{err}</p> : null}
    </div>
  );
}
