import Link from "next/link";

export function ProductSeoShell({
  title,
  lead,
  breadcrumbs,
}: {
  title: string;
  lead?: string | null;
  breadcrumbs: { name: string; href: string; current?: boolean }[];
}) {
  const snippet = lead?.trim().slice(0, 320);

  return (
    <header className="kn-product-seo-shell" aria-label="Ürün özeti">
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
        <h1 className="kn-product-seo-shell__title">{title}</h1>
        {snippet ? <p className="kn-product-seo-shell__lead">{snippet}</p> : null}
      </div>
    </header>
  );
}
