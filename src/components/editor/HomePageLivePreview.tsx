"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroSliderBlock } from "@/components/store/HeroSliderBlock";
import type { EditorShopBlock } from "@/lib/blocks/editor-ids";

type PreviewProduct = {
  slug: string;
  title: string;
  imageUrl: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
};

function ProductGridPreview({
  limit,
  collectionSlug,
}: {
  limit: number;
  collectionSlug?: string;
}) {
  const [products, setProducts] = useState<PreviewProduct[]>([]);

  useEffect(() => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (collectionSlug) q.set("collectionSlug", collectionSlug);
    void fetch(`/api/store/product-grid-preview?${q}`)
      .then((r) => r.json())
      .then((d: { products?: PreviewProduct[] }) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [limit, collectionSlug]);

  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Bu bölümde ürün yok — Admin → Ürünler’den ekleyin veya koleksiyon slug’ını kontrol edin.
      </p>
    );
  }

  return (
    <div className="kn-product-grid">
      {products.map((p) => (
        <Link key={p.slug} href={`/products/${p.slug}`} className="kn-product-card">
          <div className="kn-product-card__media">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="kn-product-card__img" />
            ) : (
              <div className="kn-product-card__img kn-product-card__img--placeholder" />
            )}
          </div>
          <div className="kn-product-card__body">
            <p className="kn-product-card__title">{p.title}</p>
            <p className="kn-product-card__price">{(p.priceMinor / 100).toFixed(2)} TL</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Ana sayfa — vitrinle aynı görünüm, anında güncellenir */
export function HomePageLivePreview({ blocks }: { blocks: EditorShopBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">
        Sol panelden widget ekleyin.
      </p>
    );
  }

  return (
    <div className="kn-theme-preview bg-[var(--kn-bg,#fafafa)] text-[var(--kn-text,#111)]">
      {blocks.map((block) => (
        <section key={block.id} className="kn-block" data-block-type={block.type}>
          {block.type === "announcementBar" ? (
            <div className="kn-announcement">
              <span>{block.props.text}</span>
              {block.props.linkHref ? (
                <Link href={block.props.linkHref}>{block.props.linkLabel ?? "Detay"}</Link>
              ) : null}
            </div>
          ) : null}

          {block.type === "heroSlider" ? (
            <HeroSliderBlock
              slides={block.props.slides}
              autoplayMs={block.props.autoplayMs}
              exploreLabel="Keşfet"
            />
          ) : null}

          {block.type === "collectionGrid" ? (
            <div className="kn-section">
              {block.props.title ? <h2 className="kn-section__title">{block.props.title}</h2> : null}
              <div className="kn-collection-grid">
                {block.props.items.map((item) => (
                  <Link key={item.id} href={item.href} className="kn-collection-card">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <div className="kn-collection-card__ph" />
                    )}
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {block.type === "productGrid" ? (
            <div className="kn-section">
              {block.props.title ? <h2 className="kn-section__title">{block.props.title}</h2> : null}
              <ProductGridPreview
                limit={block.props.limit ?? 8}
                collectionSlug={block.props.collectionSlug}
              />
            </div>
          ) : null}

          {block.type === "imageTextSplit" ? (
            <div className={`kn-split kn-split--${block.props.imagePosition ?? "left"}`}>
              {block.props.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.props.imageUrl} alt="" />
              ) : null}
              <div>
                <h2>{block.props.title}</h2>
                <p>{block.props.body}</p>
              </div>
            </div>
          ) : null}

          {block.type === "testimonials" ? (
            <div className="kn-section">
              {block.props.title ? <h2 className="kn-section__title">{block.props.title}</h2> : null}
              <div className="kn-testimonials">
                {block.props.items.map((t) => (
                  <blockquote key={t.id}>
                    <p>{t.quote}</p>
                    <footer>— {t.name}</footer>
                  </blockquote>
                ))}
              </div>
            </div>
          ) : null}

          {block.type === "promoMarquee" ? (
            <div className="kn-marquee">
              <span>{block.props.text}</span>
            </div>
          ) : null}

          {block.type === "newsletter" ? (
            <div className="kn-newsletter">
              <h2>{block.props.title}</h2>
              {block.props.subtitle ? <p>{block.props.subtitle}</p> : null}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
