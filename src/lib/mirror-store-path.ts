/** Mirror HTML dosya yolu → mağaza URL yolu */

export function inferMirrorStorePath(normalized: string): string | null {
  const n = normalized.replace(/\\/g, "/");
  const product = n.match(/\/products\/([^/]+?)(?:-tr|-en)?\.html$/i);
  if (product) return `/products/${decodeURIComponent(product[1])}`;

  const collection = n.match(/\/collections\/([^/]+?)(?:-tr|-en)?\.html$/i);
  if (collection) return `/collections/${decodeURIComponent(collection[1])}`;

  const page = n.match(/\/pages\/([^/]+?)(?:-tr|-en)?\.html$/i);
  if (page) return `/pages/${decodeURIComponent(page[1])}`;

  const blog = n.match(/\/blogs\/([^/]+?)(?:-tr|-en)?\.html$/i);
  if (blog) return `/blogs/${decodeURIComponent(blog[1])}`;

  if (/\/index(?:-tr|-en)?\.html$/i.test(n)) return "/";
  if (/\/cart(?:-tr|-en)?\.html$/i.test(n)) return "/cart";
  if (/\/checkout(?:-tr|-en)?\.html$/i.test(n)) return "/checkout";

  return null;
}
