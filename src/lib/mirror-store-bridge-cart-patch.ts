/** kn-store-bridge — sepet çekmecesi açılmadan önce /api/cart ile senkronize et */

const OPEN_DRAWER_PATCH = `function openDrawer(source) {
    if (source === "cart-drawer" && typeof window.__knRefreshCart === "function") {
      window.__knRefreshCart().then(function () { openDrawerKnNow(source); });
      return true;
    }
    return openDrawerKnNow(source);
  }
  function openDrawerKnNow(source) {
    var drawer = document.querySelector('[data-drawer="' + source + '"]');`;

const OPEN_DRAWER_RE =
  /function openDrawer\(source\) \{\s*\n\s*var drawer = document\.querySelector\('\[data-drawer="' \+ source \+ '"\]'\);/;

/** Inline kn-store-bridge JS */
export function patchMirrorStoreBridgeCartRefresh(js: string): string {
  if (!js.includes("function openDrawer") || js.includes("openDrawerKnNow")) {
    return js;
  }
  return js.replace(OPEN_DRAWER_RE, OPEN_DRAWER_PATCH);
}

/** Mirror HTML — kn-store-bridge script bloğu */
export function patchMirrorStoreBridgeCartRefreshInHtml(html: string): string {
  if (!html.includes("kn-store-bridge") || html.includes("openDrawerKnNow")) {
    return html;
  }
  return html.replace(OPEN_DRAWER_RE, OPEN_DRAWER_PATCH);
}
