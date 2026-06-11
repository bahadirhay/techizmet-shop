import Link from "next/link";
import type { ShopBlock } from "@/lib/blocks/schema";
import type { StoreMessages } from "@/lib/i18n/messages";
import { HeroSliderBlock } from "@/components/store/HeroSliderBlock";
import { ProductGridBlock } from "@/components/store/ProductGridBlock";
import { FeatureCardsBlock } from "@/components/store/FeatureCardsBlock";

export async function StorePublicBlocks({
  blocks,
  messages,
}: {
  blocks: ShopBlock[];
  messages?: StoreMessages["blocks"];
}) {
  const m = messages ?? {
    explore: "Keşfet",
    continue: "Devam",
    detail: "Detay",
    products: "ürün",
    subscribe: "Kaydol",
    emailPlaceholder: "E-posta",
  };
  return (
    <>
      {blocks.map((block, i) => (
        <section key={i} className="kn-block" data-block-type={block.type}>
          {block.type === "announcementBar" ? (
            <div className="kn-announcement">
              <span>{block.props.text}</span>
              {block.props.linkHref ? (
                <Link href={block.props.linkHref}>{block.props.linkLabel ?? m.detail}</Link>
              ) : null}
            </div>
          ) : null}

          {block.type === "heroSlider" ? (
            <HeroSliderBlock
              slides={block.props.slides}
              autoplayMs={block.props.autoplayMs}
              exploreLabel={m.explore}
            />
          ) : null}

          {block.type === "text" ? (
            <div
              className={`kn-prose kn-align-${block.props.align ?? "left"}`}
              dangerouslySetInnerHTML={{
                __html:
                  block.props.as === "h1"
                    ? `<h1>${block.props.content}</h1>`
                    : block.props.as === "h2"
                      ? `<h2>${block.props.content}</h2>`
                      : block.props.as === "h3"
                        ? `<h3>${block.props.content}</h3>`
                        : `<p>${block.props.content}</p>`,
              }}
            />
          ) : null}

          {block.type === "button" ? (
            <div className={`kn-block-actions kn-align-${block.props.align ?? "center"}`}>
              <Link
                href={block.props.href}
                className={`kn-btn kn-btn--${block.props.variant ?? "primary"}`}
              >
                {block.props.label}
              </Link>
            </div>
          ) : null}

          {block.type === "image" ? (
            <figure className={`kn-figure ${block.props.rounded ? "kn-figure--rounded" : ""}`}>
              {block.props.href ? (
                <Link href={block.props.href}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={block.props.src} alt={block.props.alt ?? ""} />
                </Link>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.props.src} alt={block.props.alt ?? ""} />
              )}
            </figure>
          ) : null}

          {block.type === "imageTextSplit" ? (
            <div
              className={`kn-split kn-split--${block.props.imagePosition ?? "left"}`}
            >
              {block.props.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.props.imageUrl} alt={block.props.imageAlt ?? ""} />
              ) : null}
              <div>
                <h2>{block.props.title}</h2>
                <p>{block.props.body}</p>
                {block.props.ctaHref ? (
                  <Link href={block.props.ctaHref} className="kn-btn kn-btn--outline">
                    {block.props.ctaLabel ?? m.continue}
                  </Link>
                ) : null}
              </div>
            </div>
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
                    {item.productCount != null ? (
                      <small>
                        {item.productCount} {m.products}
                      </small>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {block.type === "productGrid" ? (
            <div className="kn-section">
              {block.props.title ? <h2 className="kn-section__title">{block.props.title}</h2> : null}
              <ProductGridBlock
                limit={block.props.limit ?? 8}
                collectionSlug={block.props.collectionSlug}
              />
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
              <span aria-hidden>{block.props.text}</span>
            </div>
          ) : null}

          {block.type === "newsletter" ? (
            <div className="kn-newsletter">
              <h2>{block.props.title}</h2>
              {block.props.subtitle ? <p>{block.props.subtitle}</p> : null}
              <form className="kn-newsletter__form" action="#" method="post">
                <input type="email" placeholder={m.emailPlaceholder} required />
                <button type="submit" className="kn-btn kn-btn--primary">
                  {block.props.buttonLabel ?? m.subscribe}
                </button>
              </form>
            </div>
          ) : null}

          {block.type === "featureCards" ? <FeatureCardsBlock {...block.props} /> : null}

          {block.type === "map" ? (() => {
            const url =
              block.props.embedUrl?.trim() ||
              (block.props.address?.trim()
                ? `https://maps.google.com/maps?q=${encodeURIComponent(block.props.address.trim())}&output=embed`
                : null);
            if (!url) return null;
            const fw = block.props.fullWidth;
            return (
              <div style={fw ? {
                width: "100%",
                overflow: "hidden",
              } : {
                width: "100%",
                overflow: "hidden",
                borderRadius: "12px",
                border: "1px solid #e4e4e7",
              }}>
                <iframe
                  title="Harita"
                  src={url}
                  style={{ width: "100%", height: block.props.height ?? 400, border: "none", display: "block" }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            );
          })() : null}
        </section>
      ))}
    </>
  );
}
