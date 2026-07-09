"use client";

import { useLayoutEffect } from "react";
import { MIRROR_ACCOUNT_BRIDGE_JS } from "@/lib/mirror-account-bridge";
import { MIRROR_CART_BRIDGE_JS } from "@/lib/mirror-cart-bridge";
import { MIRROR_SEARCH_BRIDGE_JS } from "@/lib/mirror-search-bridge";
import { ThemeShellDrawerDeferredStyles } from "@/components/store/ThemeShellDrawerDeferredStyles";

function injectInlineScript(id: string, code: string) {
  if (!code || document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  el.textContent = code;
  document.body.appendChild(el);
}

/** Canlı vitrin ile aynı cart/account/search çekmeceleri + köprü scriptleri */
export function ThemeShellMirrorDrawers({
  html,
  stylesheets,
  storeBridgeJs,
}: {
  html: string;
  stylesheets: string[];
  storeBridgeJs: string;
}) {
  useLayoutEffect(() => {
    document.documentElement.dataset.knNavServer = "1";
    if (!html || document.getElementById("kn-theme-shell-drawers-root")) return;

    const root = document.createElement("div");
    root.id = "kn-theme-shell-drawers-root";
    root.innerHTML = html;
    document.body.appendChild(root);

    // Çekmeceler DOM'da olduktan sonra köprü scriptleri yükle
    injectInlineScript("kn-store-bridge", storeBridgeJs);
    injectInlineScript("kn-cart-bridge", MIRROR_CART_BRIDGE_JS);
    injectInlineScript("kn-account-bridge", MIRROR_ACCOUNT_BRIDGE_JS);
    injectInlineScript("kn-search-bridge", MIRROR_SEARCH_BRIDGE_JS);
  }, [html, storeBridgeJs]);

  return <ThemeShellDrawerDeferredStyles hrefs={stylesheets} />;
}
