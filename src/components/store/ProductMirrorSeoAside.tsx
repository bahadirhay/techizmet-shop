import Link from "next/link";
import { formatTry } from "@/lib/format";
import "./product-mirror-seo.css";

/** Mirror iframe dışında Google/AI için taranabilir ürün özeti */
export function ProductMirrorSeoAside({
  title,
  description,
  priceMinor,
  slug,
}: {
  title: string;
  description?: string | null;
  priceMinor: number;
  slug: string;
}) {
  const lead = (description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

  return (
    <section className="kn-product-mirror-seo" aria-label={title}>
      <div className="kn-product-mirror-seo__inner">
        <h1 className="kn-product-mirror-seo__title">{title}</h1>
        {lead ? <p className="kn-product-mirror-seo__lead">{lead}{lead.length >= 280 ? "…" : ""}</p> : null}
        <p className="kn-product-mirror-seo__price">
          Fiyat: <strong>{formatTry(priceMinor)}</strong>
        </p>
        <nav className="kn-product-mirror-seo__links" aria-label="İlgili kategoriler">
          <Link href={`/products/${slug}`}>Ürün detayı</Link>
          <Link href="/collections/kopek-odul-mamasi">Köpek ödül maması</Link>
          <Link href="/collections/dogal-kopek-odul-mamasi">Doğal köpek ödül maması</Link>
          <Link href="/collections/all">Tüm ürünler</Link>
        </nav>
      </div>
    </section>
  );
}
