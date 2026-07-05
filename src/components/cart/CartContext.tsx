"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartView } from "@/lib/cart/types";

const lineKey = (productId: string, variantId?: string | null) =>
  `${productId}:${variantId ?? ""}`;

/** Sunucu yanıtı gelene kadar sepeti yerelde tahmini güncelle (anlık UI) */
function applyOptimisticQty(
  cart: CartView,
  productId: string,
  variantId: string | null | undefined,
  nextQty: number,
): CartView {
  const key = lineKey(productId, variantId);
  const items = cart.items
    .map((line) => {
      if (lineKey(line.productId, line.variantId) !== key) return line;
      const clamped = Math.max(0, Math.min(nextQty, line.maxQty || nextQty));
      if (clamped <= 0) return null;
      const perUnitDiscount = line.qty > 0 ? line.discountMinor / line.qty : 0;
      const lineMinor = line.unitMinor * clamped;
      const discountMinor = Math.round(perUnitDiscount * clamped);
      return {
        ...line,
        qty: clamped,
        lineMinor,
        discountMinor,
        lineTotalMinor: lineMinor - discountMinor,
      };
    })
    .filter((l): l is CartView["items"][number] => l !== null);

  const itemCount = items.reduce((n, l) => n + l.qty, 0);
  const subtotalMinor = items.reduce((n, l) => n + l.lineMinor, 0);
  const discountMinor = items.reduce((n, l) => n + l.discountMinor, 0);
  return {
    ...cart,
    items,
    itemCount,
    subtotalMinor,
    discountMinor,
    totalMinor: subtotalMinor - discountMinor + cart.shippingMinor,
  };
}

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
  /** Bekleyen (debounce'lu) adet güncellemelerini hemen sunucuya gönder ve bekle */
  flushQty: () => Promise<void>;
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

  const qtyTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingQty = useRef<
    Map<string, { productId: string; variantId?: string | null; qty: number }>
  >(new Map());

  const sendQty = useCallback(
    async (productId: string, qty: number, variantId?: string | null) => {
      try {
        const res = await fetch(`/api/cart/items/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ qty, variantId: variantId ?? undefined }),
        });
        if (res.ok) {
          const j = (await res.json()) as { cart: CartView };
          setCart(j.cart);
        } else {
          void refresh();
        }
      } catch {
        void refresh();
      }
    },
    [refresh],
  );

  const setQty = useCallback(
    (productId: string, qty: number, variantId?: string | null) => {
      // Anlık UI: sunucu beklemeden yerelde güncelle
      setCart((prev) => (prev ? applyOptimisticQty(prev, productId, variantId, qty) : prev));

      // Ağ isteğini debounce et — hızlı +/- tıklamalarında tek PATCH
      const key = lineKey(productId, variantId);
      pendingQty.current.set(key, { productId, variantId, qty });
      const timers = qtyTimers.current;
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          const p = pendingQty.current.get(key);
          pendingQty.current.delete(key);
          if (p) void sendQty(p.productId, p.qty, p.variantId);
        }, 350),
      );
      return Promise.resolve();
    },
    [sendQty],
  );

  /** Bekleyen tüm adet güncellemelerini hemen gönder (navigasyon öncesi) */
  const flushQty = useCallback(async () => {
    const timers = qtyTimers.current;
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    const pending = [...pendingQty.current.values()];
    pendingQty.current.clear();
    if (!pending.length) return;
    // Aynı oturumda sıralı gönder — yarış/karışık sıra olmasın
    for (const p of pending) {
      await sendQty(p.productId, p.qty, p.variantId);
    }
  }, [sendQty]);

  const removeItem = useCallback(async (productId: string, variantId?: string | null) => {
    setCart((prev) => (prev ? applyOptimisticQty(prev, productId, variantId, 0) : prev));
    const q = variantId ? `?variantId=${encodeURIComponent(variantId)}` : "";
    try {
      const res = await fetch(`/api/cart/items/${productId}${q}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        const j = (await res.json()) as { cart: CartView };
        setCart(j.cart);
      } else {
        void refresh();
      }
    } catch {
      void refresh();
    }
  }, [refresh]);

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

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const renderCartDrawer = useCallback((cartView: CartView) => {
    setCart(cartView);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.__knOpenCart = openCart;
    win.__knRefreshCart = refresh;
    win.__knRenderCartDrawer = renderCartDrawer;
    return () => {
      delete win.__knOpenCart;
      delete win.__knRefreshCart;
      delete win.__knRenderCartDrawer;
    };
  }, [openCart, refresh, renderCartDrawer]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      refresh,
      addItem,
      setQty,
      removeItem,
      flushQty,
      applyCoupon,
      removeCoupon,
      openCart,
      closeCart,
      isOpen,
    }),
    [cart, loading, refresh, addItem, setQty, removeItem, flushQty, applyCoupon, removeCoupon, openCart, closeCart, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
