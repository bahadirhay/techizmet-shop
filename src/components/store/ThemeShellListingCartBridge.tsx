"use client";

import { useLayoutEffect } from "react";
import { MIRROR_LISTING_CART_BRIDGE_JS } from "@/lib/mirror-listing-cart-bridge";

function callListingCartBoot() {
  const w = window as Window & { __knListingCartBoot?: () => void };
  w.__knListingCartBoot?.();
}

/** SSR script yoksa yedek — canlı katalog patch sonrası boot tekrar çağrılır */
export function ThemeShellListingCartBridge() {
  useLayoutEffect(() => {
    if (document.getElementById("kn-listing-cart-bridge")) {
      callListingCartBoot();
      return;
    }
    const el = document.createElement("script");
    el.id = "kn-listing-cart-bridge";
    el.textContent = MIRROR_LISTING_CART_BRIDGE_JS;
    document.body.appendChild(el);
  }, []);

  return null;
}

export { callListingCartBoot };
