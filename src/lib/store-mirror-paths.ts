/** Mirror iframe tam ekran — React header/footer yok */
export function isMirrorShellPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/collections" ||
    pathname.startsWith("/collections/") ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/pages/") ||
    pathname === "/blogs/news" ||
    pathname.startsWith("/blogs/news/") ||
    pathname === "/account" ||
    pathname === "/account/login" ||
    pathname === "/account/register" ||
    pathname === "/account/forgot-password" ||
    pathname === "/account/favorites" ||
    pathname === "/cart" ||
    pathname === "/search" ||
    pathname === "/checkout" ||
    pathname === "/checkout/embed" ||
    pathname === "/checkout/success"
  );
}
