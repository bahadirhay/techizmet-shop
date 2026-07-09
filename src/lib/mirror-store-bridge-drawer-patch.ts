/** kn-store-bridge — hesap çekmecesi içindeki # linkleri arama çekmecesine açmasın */

const DRAWER_CLICK_SNIPPET = `if (!a) return;
    if (a.closest("account-drawer")) return;
    var href = a.getAttribute("href") || "";`;

const CLOSE_DRAWER_BIND_RE =
  /document\.querySelectorAll\("\[data-close-drawer\],\[data-drawer-close\]"\)\.forEach\(function \(btn\) \{\s*btn\.addEventListener\("click", closeDrawers\);\s*\}\);/;

const CLOSE_DRAWER_BIND_DELEGATED = `window.__knCloseDrawers = closeDrawers;
  if (!document.documentElement.dataset.knDrawerCloseBound) {
    document.documentElement.dataset.knDrawerCloseBound = "1";
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-close-drawer],[data-drawer-close]") : null;
      if (!btn) return;
      var drawer = btn.closest("cart-drawer,account-drawer,search-drawer,[data-drawer]");
      if (!drawer) return;
      e.preventDefault();
      e.stopPropagation();
      closeDrawers();
    }, true);
  }`;

/** Tema kabuğu — çekmeceler body'ye sonradan eklenir; tek seferlik querySelectorAll yetmez */
export function patchMirrorStoreBridgeDrawerClose(js: string): string {
  if (!js.includes("function closeDrawers") || js.includes("knDrawerCloseBound")) {
    return js;
  }
  if (!CLOSE_DRAWER_BIND_RE.test(js)) return js;
  return js.replace(CLOSE_DRAWER_BIND_RE, CLOSE_DRAWER_BIND_DELEGATED);
}

/** Eski mirror HTML — kn-store-bridge click handler + çekmece kapatma */
export function patchMirrorStoreBridgeDrawerClickGuard(html: string): string {
  if (!html.includes("kn-store-bridge")) return html;

  let out = html;
  if (!out.includes('a.closest("account-drawer")')) {
    out = out.replace(
      /if \(!a\) return;\s*\n\s*var href = a\.getAttribute\("href"\) \|\| "";/g,
      DRAWER_CLICK_SNIPPET,
    );
  }
  if (!out.includes("knDrawerCloseBound") && CLOSE_DRAWER_BIND_RE.test(out)) {
    out = out.replace(CLOSE_DRAWER_BIND_RE, CLOSE_DRAWER_BIND_DELEGATED);
  }
  return out;
}
