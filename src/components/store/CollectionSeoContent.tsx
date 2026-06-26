import Link from "next/link";
import { formatTry } from "@/lib/format";

export type SeoContentCriterion = { title: string; text: string };
export type SeoContentFaq = { question: string; answer: string };
export type SeoContentProduct = { name: string; slug: string; priceMinor: number };
export type SeoContentLink = { label: string; href: string };

/**
 * Mirror (iframe) mimarisinde sayfanın görünür içeriği iframe içinde kaldığı için
 * arama motorları ve AI tarayıcıları ana URL'de neredeyse boş bir kabuk görür.
 * Bu bileşen aynı URL'de taranabilir, görünür ve faydalı bir içerik bloğu basar:
 * H1 + giriş + satın alma kriterleri + gerçek ürün linkleri + görünür SSS + iç linkler.
 */
export function CollectionSeoContent({
  heading,
  intro,
  criteria,
  products,
  faqs,
  relatedLinks,
  renderHeadingAs = "h1",
}: {
  heading: string;
  intro: string;
  criteria: SeoContentCriterion[];
  products?: SeoContentProduct[];
  faqs: SeoContentFaq[];
  relatedLinks?: SeoContentLink[];
  renderHeadingAs?: "h1" | "h2";
}) {
  const Heading = renderHeadingAs;
  return (
    <section className="kn-seo-content" aria-label={heading}>
      <div className="kn-seo-content__inner">
        <Heading className="kn-seo-content__title">{heading}</Heading>
        {intro ? <p className="kn-seo-content__intro">{intro}</p> : null}

        {criteria.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">Nasıl seçilir?</h2>
            <ul className="kn-seo-content__criteria">
              {criteria.map((c) => (
                <li key={c.title}>
                  <strong>{c.title}:</strong> {c.text}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {products?.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">Öne çıkan ürünler</h2>
            <ul className="kn-seo-content__products">
              {products.map((p) => (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`}>{p.name}</Link>
                  <span className="kn-seo-content__price"> — {formatTry(p.priceMinor)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {faqs.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">Sıkça sorulan sorular</h2>
            <div className="kn-seo-content__faq">
              {faqs.map((f) => (
                <details key={f.question}>
                  <summary>{f.question}</summary>
                  <p>{f.answer}</p>
                </details>
              ))}
            </div>
          </>
        ) : null}

        {relatedLinks?.length ? (
          <>
            <h2 className="kn-seo-content__subtitle">İlgili sayfalar</h2>
            <ul className="kn-seo-content__related">
              {relatedLinks.map((l) => (
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
