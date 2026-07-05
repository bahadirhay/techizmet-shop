"use client";

import { useEffect } from "react";
import { MIRROR_LISTING_CART_BRIDGE_JS } from "@/lib/mirror-listing-cart-bridge";

/** Sepete ekle köprüsü — React <script> SSR'da çalışmaz, DOM'a enjekte edilir */
export function ThemeShellListingCartBridge() {
  useEffect(() => {
    if (document.getElementById("kn-listing-cart-bridge")) return;
    const el = document.createElement("script");
    el.id = "kn-listing-cart-bridge";
    el.textContent = MIRROR_LISTING_CART_BRIDGE_JS;
    document.body.appendChild(el);
  }, []);

  return null;
}
