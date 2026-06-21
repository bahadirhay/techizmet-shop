"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartView } from "@/lib/cart/types";

type CartContextValue = {
  cart: CartView | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (
    productId: string,
    qty?: number,
    variantId?: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;
  setQty: (productId: string, qty: number, variantId?: string | null) => Promise<void>;
  removeItem: (productId: string, variantId?: string | null) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  isOpen: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const emptyCart: CartView = {
  items: [],
  itemCount: 0,
  subtotalMinor: 0,
  discountMinor: 0,
  shippingMinor: 0,
  totalMinor: 0,
  couponCode: null,
  couponLabel: null,
  campaignId: null,
  campaignIds: [],
  freeShipping: false,
  freeShippingThresholdMinor: 0,
  freeShippingRemainingMinor: 0,
  memberDiscountPercent: 0,
  memberGroupName: null,
  errors: [],
};

export function CartProvider({
  children,
  initialCart,
}: {
  children: ReactNode;
  /** Sunucu tarafı sepet — ödeme embed'de boş flaşını önler */
  initialCart?: CartView | null;
}) {
  const [cart, setCart] = useState<CartView | null>(initialCart ?? null);
  const [loading, setLoading] = useState(initialCart == null);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/cart", { credentials: "same-origin" });
    if (res.ok) {
      const j = (await res.json()) as { cart: CartView };
      setCart(j.cart);
    } else setCart(emptyCart);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, qty = 1, variantId?: string | null) => {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId, qty, variantId: variantId ?? undefined }),
      });
      const j = (await res.json()) as { cart?: CartView; error?: string };
      if (res.ok && j.cart) {
        setCart(j.cart);
        setIsOpen(true);
        return { ok: true };
      }
      return { ok: false, error: j.error ?? "Eklenemedi" };
    },
    [],
  );

  const setQty = useCallback(async (productId: string, qty: number, variantId?: string | null) => {
    const res = await fetch(`/api/cart/items/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ qty, variantId: variantId ?? undefined }),
    });
    if (res.ok) {
      const j = (await res.json()) as { cart: CartView };
      setCart(j.cart);
    }
  }, []);

  const removeItem = useCallback(async (productId: string, variantId?: string | null) => {
    const q = variantId ? `?variantId=${encodeURIComponent(variantId)}` : "";
    const res = await fetch(`/api/cart/items/${productId}${q}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) {
      const j = (await res.json()) as { cart: CartView };
      setCart(j.cart);
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      const j = (await res.json()) as { cart: CartView };
      setCart(j.cart);
    }
  }, []);

  const removeCoupon = useCallback(async () => {
    const res = await fetch("/api/cart/coupon", { method: "DELETE", credentials: "same-origin" });
    if (res.ok) {
      const j = (await res.json()) as { cart: CartView };
      setCart(j.cart);
    }
  }, []);

  const value = useMemo(
    () => ({
      cart,
      loading,
      refresh,
      addItem,
      setQty,
      removeItem,
      applyCoupon,
      removeCoupon,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      isOpen,
    }),
    [cart, loading, refresh, addItem, setQty, removeItem, applyCoupon, removeCoupon, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
