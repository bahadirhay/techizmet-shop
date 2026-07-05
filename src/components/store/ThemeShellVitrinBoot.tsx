"use client";

import { useEffect } from "react";
import { initProductCardGalleries } from "@/lib/mirror-product-card-gallery";
import { installMirrorStreetFoodBar } from "@/lib/mirror-street-food-bar";
import { installMirrorStreetFoodFundPage } from "@/lib/mirror-street-food-fund-page";
import { bootTestimonialSections } from "@/lib/mirror-testimonial-section";

/** reveal-text animasyonu tema kabuğunda çalışmaz — statik metni göster */
function bootRevealingTextSection() {
  const section = document.querySelector("#MainContent .section-revealing-text");
  if (!section || section.getAttribute("data-kn-pdp-hidden") === "1") return;
  section.setAttribute("data-kn-revealing-ready", "1");
  if (section.querySelector(".kn-revealing-static-text")) return;

  const raw =
    section.querySelector(".revealing-text--content")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!raw) return;

  section.querySelectorAll("reveal-text, .revealing-text-line, .revealing-text-char").forEach((el) => {
    el.remove();
  });
  const wrapper = section.querySelector(".revealing-text--wrapper");
  if (wrapper) {
    wrapper.innerHTML = `<div class="kn-revealing-static"><p class="kn-revealing-static-text heading-font h2">${raw}</p></div>`;
  }
}

/** Ürün kartı hover galerisi + mama fonu hero — iframe client patch eşdeğeri */
export function bootThemeShellVitrinFeatures() {
  initProductCardGalleries(document);
  installMirrorStreetFoodBar(document);
  installMirrorStreetFoodFundPage(document);
  bootRevealingTextSection();
  bootTestimonialSections(document);
}

export function ThemeShellVitrinBoot() {
  useEffect(() => {
    bootThemeShellVitrinFeatures();
    const timers = [120, 600, 2000, 5000].map((ms) =>
      window.setTimeout(bootThemeShellVitrinFeatures, ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return null;
}
