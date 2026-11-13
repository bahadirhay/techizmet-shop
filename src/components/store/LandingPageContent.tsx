import "./collection-seo-content.css";
import Link from "next/link";
import { ProductCardServer } from "@/components/store/ProductCardServer";
import { formatTry } from "@/lib/format";
import type { CustomerGroupPricing } from "@/lib/pricing/group-catalog";
import type { LandingPageData, LandingProduct } from "@/lib/seo/landing-page-data";
import { toDisplayPrice } from "@/lib/store/customer-pricing";

/** İlk satırdaki kart sayısı — bu görseller lazy yüklenmez */
const EAGER_CARD_COUNT = 4;

function ProductGrid({
  products,
  memberPricing,
  eagerCount = 0,
}: {
  products: LandingProduct[];
  memberPricing: CustomerGroupPricing | null;
  eagerCount?: number;
}) {
  return (
    <div className="kn-product-grid kn-landing__grid">
      {products.map((p, index) => (
        <ProductCardServer
          key={p.id}
          slug={p.slug}
          title={p.title}
          imageUrl={p.imageUrl}
          badgesJson={p.badgesJson}
          stockQty={p.stockQty}
          lowStockThreshold={p.lowStockThreshold}
          priceMinor={p.priceMinor}
          compareAtMinor={p.compareAtMinor}
          memberPricing={memberPricing}
          eagerImage={index < eagerCount}
        />
      ))}
    </div>
  );
}

function ingredientLabel(p: LandingProduct): string {
  return p.ingredients.map((i) => i.label).join(" + ");
}

function textureLabel(p: LandingProduct): string {
  if (p.ingredients.length === 1) return p.ingredients[0].texture;
  return p.ingredients.length > 1 ? "Karışık doku" : "";
}

function usageLabel(p: LandingProduct): string {
  return [...new Set(p.ingredients.map((i) => i.use))].join(" + ");
}

/**
 * Adanmış landing sayfası (/collections/<slug>) — tamamı sunucuda, tek parça basılır.
 * Bileşen eşzamanlıdır: veri sayfada beklenir; böylece ürün ızgarası akışla sonradan
 * gelen gizli bir bloğa düşmez ve tarayıcısız botlar da ürünleri gövdede görür.
 */
export function LandingPageContent({
  data,
  memberPricing,
}: {
  data: LandingPageData;
  memberPricing: CustomerGroupPricing | null;
}) {
  const hasGroups = data.groups.length > 0;

  return (
    <section className="kn-seo-content" aria-label={data.heading}>
      <div className="kn-seo-content__inner kn-landing__inner">
        <h1 className="kn-seo-content__title">{data.heading}</h1>
        {data.intro.map((paragraph) => (
          <p key={paragraph} className="kn-seo-content__intro">
            {paragraph}
          </p>
        ))}

        {hasGroups ? (
          data.groups.map((group, groupIndex) => (
            <div key={group.title} className="kn-landing__group">
              <h2 className="kn-seo-content__subtitle">{group.title}</h2>
              <p className="kn-landing__group-text">
                {group.text}
                {group.link ? (
                  <>
                    {" "}
                    <Link href={group.link.href}>{group.link.label} →</Link>
                  </>
                ) : null}
              </p>
              <ProductGrid
                products={group.products}
                memberPricing={memberPricing}
                eagerCount={groupIndex === 0 ? EAGER_CARD_COUNT : 0}
              />
            </div>
          ))
        ) : data.products.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">Ürünler</h2>
            <ProductGrid
              products={data.products}
              memberPricing={memberPricing}
              eagerCount={EAGER_CARD_COUNT}
            />
          </>
        ) : null}

        {data.products.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">{data.tableHeading}</h2>
            <div className="kn-landing__table-wrap">
              <table className="kn-landing__table">
                <thead>
                  <tr>
                    <th scope="col">Ürün</th>
                    {data.hasFacts ? (
                      <>
                        <th scope="col">İçerik</th>
                        <th scope="col">Doku</th>
                        <th scope="col">Kullanım</th>
                      </>
                    ) : null}
                    <th scope="col">Paket</th>
                    <th scope="col">Fiyat</th>
                    <th scope="col">100 g fiyatı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => {
                    const display = toDisplayPrice(p.priceMinor, p.compareAtMinor, memberPricing);
                    const per100g =
                      p.per100gMinor != null && p.priceMinor > 0
                        ? Math.round((p.per100gMinor * display.priceMinor) / p.priceMinor)
                        : null;
                    return (
                      <tr key={p.id}>
                        <th scope="row">
                          <Link href={`/products/${p.slug}`}>{p.title}</Link>
                        </th>
                        {data.hasFacts ? (
                          <>
                            <td>{ingredientLabel(p) || "—"}</td>
                            <td>{textureLabel(p) || "—"}</td>
                            <td>{usageLabel(p) || "—"}</td>
                          </>
                        ) : null}
                        <td>{p.packLabel || "—"}</td>
                        <td>{formatTry(display.priceMinor)}</td>
                        <td>{per100g != null ? formatTry(per100g) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="kn-landing__note">
              Fiyatlar güncel mağaza fiyatıdır; paket ve içerik bilgisi ürün sayfalarından
              alınmıştır.
            </p>
          </>
        ) : null}

        {data.criteria.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">{data.criteriaHeading}</h2>
            <ul className="kn-seo-content__criteria">
              {data.criteria.map((c) => (
                <li key={c.title}>
                  <strong>{c.title}:</strong> {c.text}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {data.faqs.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">Sıkça sorulan sorular</h2>
            <div className="kn-seo-content__faq">
              {data.faqs.map((f) => (
                <details key={f.question}>
                  <summary>{f.question}</summary>
                  <p>{f.answer}</p>
                </details>
              ))}
            </div>
          </>
        ) : null}

        {data.guides.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">İlgili rehber yazıları</h2>
            <ul className="kn-seo-content__products">
              {data.guides.map((g) => (
                <li key={g.href}>
                  <Link href={g.href}>{g.title}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {data.relatedLinks.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">İlgili sayfalar</h2>
            <ul className="kn-seo-content__related">
              {data.relatedLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
