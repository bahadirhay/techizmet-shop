/** kn-store-bridge — hesap çekmecesi içindeki # linkleri arama çekmecesine açmasın */

const DRAWER_CLICK_SNIPPET = `if (!a) return;
    if (a.closest("account-drawer")) return;
    var href = a.getAttribute("href") || "";`;

/** Eski mirror HTML — kn-store-bridge click handler */
export function patchMirrorStoreBridgeDrawerClickGuard(html: string): string {
  if (!html.includes("kn-store-bridge") || html.includes('a.closest("account-drawer")')) {
    return html;
  }

  return html.replace(
    /if \(!a\) return;\s*\n\s*var href = a\.getAttribute\("href"\) \|\| "";/g,
    DRAWER_CLICK_SNIPPET,
  );
}
