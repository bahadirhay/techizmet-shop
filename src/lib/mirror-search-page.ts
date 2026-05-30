/** Techizmet Shop — arama sonuç sayfası (collections/all mirror şablonu) */

function escText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export type MirrorSearchPageLayout = {
  term: string;
  locale?: string;
  resultCount: number;
};

export function applySearchPageLayout(doc: Document, layout: MirrorSearchPageLayout) {
  const isTr = layout.locale?.toLowerCase().startsWith("tr") ?? true;
  const term = layout.term.trim();

  doc.querySelectorAll(
    [
      "#MainContent .top-filter-bar",
      "#MainContent .horizontal-filters-bar",
      "#MainContent .main-collection--sidebar",
      "#MainContent .collection-category--main",
      "#MainContent filter-faced-form",
      "#MainContent .filter-toggle-button",
    ].join(","),
  ).forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });

  if (term.length >= 2 && layout.resultCount === 0) {
    const list = doc.querySelector("#MainContent .main-collection--products-list");
    if (list) {
      list.innerHTML = `<p class="text-center" style="padding:2rem 0;grid-column:1/-1">${escText(
        isTr ? `"${term}" için sonuç bulunamadı.` : `No results found for "${term}".`,
      )}</p>`;
    }
  }

  if (term.length > 0 && term.length < 2) {
    const list = doc.querySelector("#MainContent .main-collection--products-list");
    if (list) {
      list.innerHTML = `<p class="text-center" style="padding:2rem 0;grid-column:1/-1">${escText(
        isTr ? "Aramak için en az 2 karakter girin." : "Enter at least 2 characters to search.",
      )}</p>`;
    }
  }
}
