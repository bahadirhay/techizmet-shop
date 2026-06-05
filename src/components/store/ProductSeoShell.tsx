import Link from "next/link";

/** Native (blocks) vitrin — mirror modda kullanılmaz */
export function ProductSeoShell({
  title,
  breadcrumbs,
  showTitle = true,
}: {
  title: string;
  lead?: string | null;
  breadcrumbs: { name: string; href: string; current?: boolean }[];
  showTitle?: boolean;
}) {
  return (
    <header className="kn-product-seo-shell" aria-label="Ürün konumu">
      <div className="kn-product-seo-shell__inner">
        <nav className="kn-product-seo-shell__crumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb) => (
              <li key={`${crumb.href}-${crumb.name}`}>
                {crumb.current ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href}>{crumb.name}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {showTitle ? <h1 className="kn-product-seo-shell__title">{title}</h1> : null}
      </div>
    </header>
  );
}
