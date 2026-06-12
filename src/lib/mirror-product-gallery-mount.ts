/** PDP galeri — tek görsel, oklar, sürükleme (iframe içi) */

export function mountKnProductGallery(doc: Document, slideCount: number) {
  const outer = doc.querySelector("#MainContent .main--product-image-slider-outer") as HTMLElement | null;
  if (!outer) return;

  const wrapper = outer.querySelector(".main--product-image-slider, .swiper-wrapper") as HTMLElement | null;
  if (!wrapper) return;

  try {
    const sw = (outer as HTMLElement & { swiper?: { destroy?: (a: boolean, b: boolean) => void } }).swiper;
    sw?.destroy?.(true, true);
  } catch {
    /* tema swiper */
  }

  const slides = [...outer.querySelectorAll(".swiper-slide")];
  if (!slides.length) return;

  for (const slide of slides) {
    if (slide instanceof HTMLElement) {
      slide.style.flex = "0 0 100%";
      slide.style.width = "100%";
      slide.style.maxWidth = "100%";
    }
  }

  if (slideCount < 2) {
    outer.classList.add("kn-gallery-static");
    outer.classList.remove("kn-gallery-active");
    wrapper.style.transform = "none";
    return;
  }

  outer.classList.remove("kn-gallery-static");
  outer.classList.add("kn-gallery-active");

  const host = outer.closest("swiper-content") ?? outer.parentElement ?? outer;
  let idx = 0;
  let drag = false;
  let sx = 0;
  let dx = 0;

  const apply = (animate: boolean) => {
    wrapper.style.transition = animate ? "transform 0.35s ease" : "none";
    wrapper.style.transform = `translate3d(${-idx * 100}%,0,0)`;
    const navHost = host;
    for (const btn of navHost.querySelectorAll<HTMLElement>(
      ".swiper-button-prev, swiper-nav.swiper-button-prev",
    )) {
      btn.style.opacity = idx === 0 ? "0.35" : "1";
      btn.style.pointerEvents = "auto";
    }
    for (const btn of navHost.querySelectorAll<HTMLElement>(
      ".swiper-button-next, swiper-nav.swiper-button-next",
    )) {
      btn.style.opacity = idx >= slides.length - 1 ? "0.35" : "1";
      btn.style.pointerEvents = "auto";
    }
  };

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, idx + delta));
    if (next === idx) return;
    idx = next;
    apply(true);
  };

  apply(false);

  if (outer.getAttribute("data-kn-gallery-bound") === "1") return;
  outer.setAttribute("data-kn-gallery-bound", "1");

  host.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".swiper-button-next, swiper-nav.swiper-button-next")) {
        e.preventDefault();
        e.stopPropagation();
        go(1);
      } else if (target.closest(".swiper-button-prev, swiper-nav.swiper-button-prev")) {
        e.preventDefault();
        e.stopPropagation();
        go(-1);
      }
    },
    true,
  );

  outer.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag = true;
    sx = e.clientX;
    dx = 0;
    try {
      outer.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    wrapper.style.transition = "none";
  });

  outer.addEventListener("pointermove", (e) => {
    if (!drag) return;
    dx = e.clientX - sx;
    const pct = (dx / outer.offsetWidth) * 100;
    wrapper.style.transform = `translate3d(${-idx * 100 + pct}%,0,0)`;
  });

  const endDrag = (e: PointerEvent) => {
    if (!drag) return;
    drag = false;
    try {
      outer.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (Math.abs(dx) > outer.offsetWidth * 0.12) go(dx < 0 ? 1 : -1);
    else apply(true);
  };

  outer.addEventListener("pointerup", endDrag);
  outer.addEventListener("pointercancel", endDrag);
}
