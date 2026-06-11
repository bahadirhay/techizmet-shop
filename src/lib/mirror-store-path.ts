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

  // alt dizinlerdeki index-tr.html → doğru yolu çıkar (index genel kuralından önce)
  if (/\/checkout\/index(?:-tr|-en)?\.html$/i.test(n)) return "/checkout";
  if (/\/cart\/index(?:-tr|-en)?\.html$/i.test(n)) return "/cart";
  if (/\/account\/index(?:-tr|-en)?\.html$/i.test(n)) return "/account";
  if (/\/account\/login(?:-tr|-en)?\.html$/i.test(n)) return "/account/login";
  if (/\/account\/register(?:-tr|-en)?\.html$/i.test(n)) return "/account/register";
  if (/\/account\/forgot-password(?:-tr|-en)?\.html$/i.test(n)) return "/account/forgot-password";
  if (/\/account\/favorites(?:-tr|-en)?\.html$/i.test(n)) return "/account/favorites";
  // blogs/<slug>/index-tr.html → /blogs/<slug>
  const blogIndex = n.match(/\/blogs\/([^/]+?)\/index(?:-tr|-en)?\.html$/i);
  if (blogIndex) return `/blogs/${decodeURIComponent(blogIndex[1])}`;
  // mirror/index-tr.html — yalnızca vitrin kökü (account/cart/checkout hariç)
  if (/\/mirror\/index(?:-tr|-en)?\.html$/i.test(n)) return "/";
  if (/\/index(?:-tr|-en)?\.html$/i.test(n)) return "/";
  if (/\/cart(?:-tr|-en)?\.html$/i.test(n)) return "/cart";
  if (/\/checkout(?:-tr|-en)?\.html$/i.test(n)) return "/checkout";

  return null;
}
