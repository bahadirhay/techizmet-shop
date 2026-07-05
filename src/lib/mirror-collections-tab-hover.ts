/** Koleksiyon sekmesi — hover'da fiyat kartı (tabs-element / themeeef6 yedek) */

export function bootCollectionsTabPriceHover(doc: Document = document): void {
  doc.querySelectorAll<HTMLElement>("[data-content-item]").forEach((card) => {
    if (card.getAttribute("data-kn-tab-price-hover") === "1") return;
    const infoBox = card.querySelector<HTMLElement>("[data-item-info]");
    if (!infoBox) return;

    card.setAttribute("data-kn-tab-price-hover", "1");
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      infoBox.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      infoBox.style.opacity = "1";
    });
    card.addEventListener("mouseleave", () => {
      infoBox.style.opacity = "0";
    });
  });
}
