/** Mirror iframe tam ekran — React header/footer yok */
export function isMirrorShellPath(
  pathname: string,
  opts?: { themeShellActive?: boolean },
): boolean {
  if (opts?.themeShellActive) return false;
  return (
    pathname === "/" ||
    pathname === "/collections" ||
    pathname.startsWith("/collections/") ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/pages/") ||
    pathname === "/blogs/news" ||
    pathname === "/account" ||
    pathname === "/account/login" ||
    pathname === "/account/register" ||
    pathname === "/account/forgot-password" ||
    pathname === "/account/favorites" ||
    pathname === "/cart" ||
    pathname === "/search" ||
    pathname === "/checkout" ||
    pathname === "/checkout/embed" ||
    pathname === "/checkout/pay" ||
    pathname === "/checkout/success" ||
    pathname === "/orders/track" ||
    pathname === "/orders/track/embed" ||
    pathname === "/sokak-dostlari"
  );
}
