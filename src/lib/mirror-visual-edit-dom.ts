/** Admin önizleme — vitrin HTML içinde gezinmeyi kapat */

const SHIELD_STYLE_ID = "kn-visual-shield-style";

export function disableMirrorNavigation(doc: Document) {
  if (doc.documentElement.getAttribute("data-kn-nav-locked") === "1") return;
  doc.documentElement.setAttribute("data-kn-nav-locked", "1");

  doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href === "#" || href.startsWith("#MainContent")) return;
    a.setAttribute("data-kn-saved-href", href);
    a.setAttribute("data-kn-nav-disabled", "1");
    a.setAttribute("href", "#");
    a.removeAttribute("target");
    a.onclick = () => false;
  });

  doc.querySelectorAll<HTMLFormElement>("form[action]").forEach((form) => {
    form.setAttribute("data-kn-form-disabled", "1");
  });
}

/** Koleksiyon kartı — tüm kart tıklamasını engelle, yalnızca başlık düzenlenebilir */
export function applyCollectionCardEditShields(doc: Document) {
  if (!doc.getElementById(SHIELD_STYLE_ID)) {
    const st = doc.createElement("style");
    st.id = SHIELD_STYLE_ID;
    st.textContent = `
      .kn-card-edit-shield {
        position: absolute;
        inset: 0;
        z-index: 8;
        cursor: default;
        background: transparent;
      }
      html.kn-visual-edit-mode .collection--card-item {
        position: relative;
      }
      html.kn-visual-edit-mode a.collection--card {
        pointer-events: none !important;
      }
      html.kn-visual-edit-mode .collection--heading[data-kn-edit] {
        pointer-events: auto !important;
        position: relative;
        z-index: 9;
      }
    `;
    doc.head.appendChild(st);
  }

  doc.querySelectorAll(".collection--card-item").forEach((item) => {
    if (item.querySelector(".kn-card-edit-shield")) return;
    const el = item as HTMLElement;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const shield = doc.createElement("div");
    shield.className = "kn-card-edit-shield";
    shield.setAttribute("aria-hidden", "true");
    shield.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    el.appendChild(shield);
  });
}
