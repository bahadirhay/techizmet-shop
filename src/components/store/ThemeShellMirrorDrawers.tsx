"use client";

import { useLayoutEffect } from "react";
import { MIRROR_ACCOUNT_BRIDGE_JS } from "@/lib/mirror-account-bridge";
import { MIRROR_CART_BRIDGE_JS } from "@/lib/mirror-cart-bridge";
import { MIRROR_SEARCH_BRIDGE_JS } from "@/lib/mirror-search-bridge";
import { ThemeShellInjectScript } from "@/components/store/ThemeShellInjectScript";
import { ThemeShellDrawerDeferredStyles } from "@/components/store/ThemeShellDrawerDeferredStyles";

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
  }, [html]);
  return (
    <>
      <ThemeShellDrawerDeferredStyles hrefs={stylesheets} />
      <ThemeShellInjectScript id="kn-store-bridge" code={storeBridgeJs} />
      <ThemeShellInjectScript id="kn-cart-bridge" code={MIRROR_CART_BRIDGE_JS} />
      <ThemeShellInjectScript id="kn-account-bridge" code={MIRROR_ACCOUNT_BRIDGE_JS} />
      <ThemeShellInjectScript id="kn-search-bridge" code={MIRROR_SEARCH_BRIDGE_JS} />
    </>
  );
}
