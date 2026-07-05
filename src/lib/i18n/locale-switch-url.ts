/** Dil değişiminde CDN önbelleğini kırmak için benzersiz sorgu parametresi */

export const LOCALE_SWITCH_QUERY = "knlc";

export function buildLocaleSwitchUrl(
  pathname: string,
  search: string,
  hash: string,
): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete(LOCALE_SWITCH_QUERY);
  params.set(LOCALE_SWITCH_QUERY, String(Date.now()));
  const q = params.toString();
  return `${pathname}${q ? `?${q}` : ""}${hash}`;
}

export function stripLocaleSwitchParamFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LOCALE_SWITCH_QUERY)) return;
  url.searchParams.delete(LOCALE_SWITCH_QUERY);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
