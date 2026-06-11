"use client";

import Link from "next/link";
import { featureCardIconHtml, type FeatureCardIconKey } from "@/lib/feature-cards-icons";

export function ShopEditorPreview({ blocks }: { blocks: EditorShopBlock[] }) {
  return (
    <div className="kn-theme-preview min-h-[320px] bg-[var(--kn-bg,#fafafa)] text-[var(--kn-text,#111)]">
      {blocks.map((block) => (
        <section key={block.id} className="kn-block" data-block-type={block.type}>
          <PreviewBlock block={block} />
        </section>
      ))}
      {blocks.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-zinc-500">
          Sol panelden widget ekleyin — önizleme burada görünür.
        </p>
      ) : null}
    </div>
  );
}

function PreviewBlock({ block }: { block: EditorShopBlock }) {
  switch (block.type) {
    case "announcementBar":
      return (
        <div className="kn-announcement">
          <span>{block.props.text}</span>
          {block.props.linkHref ? (
            <Link href={block.props.linkHref}>{block.props.linkLabel ?? "Detay"}</Link>
          ) : null}
        </div>
      );
    case "heroSlider":
      return (
        <div className="kn-hero">
          {block.props.slides.map((s) => (
            <div key={s.id} className="kn-hero__slide">
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt="" className="kn-hero__img" />
              ) : (
                <div className="kn-hero__img flex items-center justify-center bg-zinc-200 text-xs text-zinc-500">
                  Görsel
                </div>
              )}
              <div className="kn-hero__content">
                <h1>{s.headline}</h1>
                {s.subline ? <p>{s.subline}</p> : null}
              </div>
            </div>
          ))}
        </div>
      );
    case "text":
      return (
        <div className={`kn-prose kn-align-${block.props.align ?? "left"}`}>
          {block.props.as === "h1" ? (
            <h1>{block.props.content}</h1>
          ) : block.props.as === "h2" ? (
            <h2>{block.props.content}</h2>
          ) : block.props.as === "h3" ? (
            <h3>{block.props.content}</h3>
          ) : (
            <p>{block.props.content}</p>
          )}
        </div>
      );
    case "button":
      return (
        <div className={`kn-block-actions kn-align-${block.props.align ?? "center"}`}>
          <span className={`kn-btn kn-btn--${block.props.variant ?? "primary"}`}>{block.props.label}</span>
        </div>
      );
    case "image":
      return block.props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.props.src}
          alt={block.props.alt ?? ""}
          className={block.props.rounded !== false ? "mx-auto max-w-full rounded-xl" : "mx-auto max-w-full"}
        />
      ) : (
        <div className="aspect-video bg-zinc-200" />
      );
    case "imageTextSplit":
      return (
        <div className={`kn-split kn-split--${block.props.imagePosition ?? "left"}`}>
          {block.props.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.props.imageUrl} alt={block.props.imageAlt ?? ""} />
          ) : (
            <div className="aspect-video bg-zinc-200" />
          )}
          <div>
            <h2>{block.props.title}</h2>
            <p>{block.props.body}</p>
          </div>
        </div>
      );
    case "collectionGrid":
      return (
        <div className="kn-section">
          {block.props.title ? <h2 className="kn-section__title">{block.props.title}</h2> : null}
          <div className="kn-collection-grid">
            {block.props.items.map((item) => (
              <div key={item.id} className="kn-collection-card">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <div className="kn-collection-card__ph" />
                )}
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "productGrid":
      return (
        <div className="kn-section">
          {block.props.title ? <h2 className="kn-section__title">{block.props.title}</h2> : null}
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
            {Array.from({ length: Math.min(block.props.limit ?? 4, 4) }).map((_, i) => (
              <div key={i} className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-center text-xs text-zinc-500">
                Ürün {i + 1}
                <br />
                (canlıda veritabanından)
              </div>
            ))}
          </div>
        </div>
      );
    case "testimonials":
      return (
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
      );
    case "promoMarquee":
      return (
        <div className="kn-marquee">
          <span>{block.props.text}</span>
        </div>
      );
    case "newsletter":
      return (
        <div className="kn-newsletter">
          <h2>{block.props.title}</h2>
          {block.props.subtitle ? <p>{block.props.subtitle}</p> : null}
          <div className="kn-newsletter__form">
            <input type="email" placeholder="E-posta" readOnly />
            <span className="kn-btn kn-btn--primary">{block.props.buttonLabel ?? "Kaydol"}</span>
          </div>
        </div>
      );
    case "featureCards":
      return (
        <div
          className="kn-fc-preview px-4 py-10"
          style={{ background: block.props.backgroundColor ?? "#faf7f2" }}
        >
          <div className="mx-auto mb-8 max-w-xl text-center">
            <h2 className="text-2xl font-bold text-zinc-900">{block.props.title}</h2>
            {block.props.subtitle ? <p className="mt-3 text-sm text-zinc-500">{block.props.subtitle}</p> : null}
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {block.props.items.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white p-6 shadow-md">
                <div className="mb-4 text-2xl font-bold">
                  {item.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.iconUrl} alt="" className="h-12 w-12 object-contain" />
                  ) : item.iconKey ? (
                    <span
                      className="inline-block [&_svg]:h-12 [&_svg]:w-12"
                      dangerouslySetInnerHTML={{
                        __html: featureCardIconHtml(item.iconKey as FeatureCardIconKey).replace(
                          /^<div[^>]*>|<\/div>$/g,
                          "",
                        ),
                      }}
                    />
                  ) : (
                    item.iconText ?? "★"
                  )}
                </div>
                <h3 className="font-bold text-zinc-900">{item.heading}</h3>
                <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "map": {
      const url =
        block.props.embedUrl?.trim() ||
        (block.props.address?.trim()
          ? `https://maps.google.com/maps?q=${encodeURIComponent(block.props.address.trim())}&output=embed`
          : null);
      if (!url) return (
        <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-600 text-sm text-zinc-400">
          📍 Harita — URL veya adres girin
        </div>
      );
      const fw = block.props.fullWidth;
      return (
        <div style={{ width: "100%", overflow: "hidden", borderRadius: fw ? "0" : "12px" }}>
          <iframe
            title="Harita önizleme"
            src={url}
            style={{ width: "100%", height: block.props.height ?? 400, border: "none", display: "block" }}
            loading="lazy"
          />
        </div>
      );
    }
    default:
      return null;
  }
}
