"use client";

import { useEffect } from "react";
import { bootCollectionsTabPriceHover } from "@/lib/mirror-collections-tab-hover";
import { initProductCardGalleries } from "@/lib/mirror-product-card-gallery";
import {
  applyCatalogPricesToDocument,
  readCatalogPriceMapFromDocument,
} from "@/lib/mirror-listing-prices";
import { readShopLocaleFromDocument } from "@/lib/i18n/locale";
import { forceMirrorResponsiveImagesInDocument } from "@/lib/mirror-image-reveal";
import {
  applyLiveStoreCatalogToDocument,
  fetchLiveStoreCatalog,
  mirrorCatalogAlreadyHydrated,
} from "@/lib/mirror-live-catalog-client";
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
  bootCollectionsTabPriceHover(document);
}

async function hydrateThemeShellCatalog(doc: Document): Promise<void> {
  const locale = readShopLocaleFromDocument(doc);
  if (mirrorCatalogAlreadyHydrated(doc, locale)) {
    const map = readCatalogPriceMapFromDocument(doc);
    if (map) applyCatalogPricesToDocument(doc, map);
    return;
  }
  const payload = await fetchLiveStoreCatalog();
  if (payload) {
    applyLiveStoreCatalogToDocument(doc, payload, locale);
  } else {
    const map = readCatalogPriceMapFromDocument(doc);
    if (map) applyCatalogPricesToDocument(doc, map);
  }
}

export function ThemeShellVitrinBoot() {
  useEffect(() => {
    const run = () => {
      bootThemeShellVitrinFeatures();
      forceMirrorResponsiveImagesInDocument(document);
      void hydrateThemeShellCatalog(document);
    };
    run();
    const timers = [120, 600, 2000, 5000].map((ms) => window.setTimeout(run, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return null;
}
