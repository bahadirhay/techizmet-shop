"use client";

import { useEffect, useRef, useState } from "react";

/** Mirror duyuru şeridi — swiper yerine hafif React rotasyonu (3sn) */
export function ThemeShellAnnouncementBar({
  slides,
  schemeClass,
}: {
  slides: string[];
  schemeClass?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const syncHeight = () => {
      const h = wrapper.offsetHeight;
      document.body.style.setProperty("--announcement_height", `${h}px`);
      document.body.style.setProperty("--dynamic_announcement_height", `${h}px`);
    };

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [slides]);

  if (!slides.length) return null;
  const current = slides[Math.min(index, slides.length - 1)] ?? slides[0];

  return (
    <div
      ref={wrapperRef}
      className={`announcement-bar--main section-wrapper kn-theme-shell-announcement ${schemeClass ?? ""} section-solid page`}
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
