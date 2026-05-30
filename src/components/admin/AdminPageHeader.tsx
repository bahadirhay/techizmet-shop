import Link from "next/link";

export function AdminPageHeader({
  breadcrumb,
  title,
  description,
  actions,
}: {
  breadcrumb?: { label: string; href?: string }[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        {breadcrumb && breadcrumb.length > 0 ? (
          <p className="admin-breadcrumb">
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {i > 0 ? " / " : null}
                {b.href ? <Link href={b.href}>{b.label}</Link> : <span>{b.label}</span>}
              </span>
            ))}
          </p>
        ) : null}
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
