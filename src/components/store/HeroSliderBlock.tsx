"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Slide = {
  id: string;
  headline: string;
  subline?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
};

export function HeroSliderBlock({
  slides,
  autoplayMs = 6000,
  exploreLabel,
}: {
  slides: Slide[];
  autoplayMs?: number;
  exploreLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1 || !autoplayMs) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), autoplayMs);
    return () => clearInterval(t);
  }, [count, autoplayMs]);

  if (!count) return null;
  const s = slides[index]!;

  return (
    <div className="kn-hero">
      <div className="kn-hero__slide">
        {s.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imageUrl} alt="" className="kn-hero__img" />
        ) : (
          <div className="kn-hero__img kn-product-card__img--placeholder" />
        )}
        <div className="kn-hero__content">
          <h1>{s.headline}</h1>
          {s.subline ? <p>{s.subline}</p> : null}
          {s.ctaHref ? (
            <Link href={s.ctaHref} className="kn-btn kn-btn--primary">
              {s.ctaLabel ?? exploreLabel}
            </Link>
          ) : null}
        </div>
      </div>
      {count > 1 ? (
        <div className="kn-hero__dots" role="tablist" aria-label="Hero slides">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`kn-hero__dot ${i === index ? "kn-hero__dot--active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
