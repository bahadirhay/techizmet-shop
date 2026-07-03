"use client";

import { useEffect, useState } from "react";

/** Mirror duyuru şeridi — swiper yerine hafif React rotasyonu (3sn) */
export function ThemeShellAnnouncementBar({
  slides,
  schemeClass,
}: {
  slides: string[];
  schemeClass?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const current = slides[Math.min(index, slides.length - 1)] ?? slides[0];

  return (
    <div
      className={`announcement-bar--main section-wrapper ${schemeClass ?? ""} section-solid page`}
      data-announcement-wrapper
    >
      <div className="container-fullwidth">
        <div className="announcement-bar--wrapper">
          <div className="announcement-bar--middle">
            <div className="announcement-bar--item">
              <p
                className="announcement-bar--text text-center text-small"
                dangerouslySetInnerHTML={{ __html: current }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
