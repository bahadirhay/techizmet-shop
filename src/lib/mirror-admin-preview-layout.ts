/** Admin vitrin önizlemesi — yalnızca seçili bölüm vurgusu (genişlik zorlaması yok) */

export const MIRROR_ADMIN_PREVIEW_STYLE_ID = "kn-admin-preview-layout";

export const MIRROR_ADMIN_PREVIEW_CSS = `
html.kn-visual-edit-mode section.shopify-section.kn-section-focus {
  outline: 3px solid rgba(225, 29, 72, 0.55);
  outline-offset: -3px;
}
`;

export function injectMirrorAdminPreviewLayout(doc: Document) {
  if (!doc.documentElement.classList.contains("kn-visual-edit-mode")) return;
  if (doc.getElementById(MIRROR_ADMIN_PREVIEW_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = MIRROR_ADMIN_PREVIEW_STYLE_ID;
  style.textContent = MIRROR_ADMIN_PREVIEW_CSS;
  doc.head.appendChild(style);
}

export function scrollMirrorSectionIntoView(doc: Document, sectionKey: string) {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const el = doc.querySelector(`section[id$="__${esc}"]`);
  if (!el) return;
  doc.querySelectorAll("section.shopify-section.kn-section-focus").forEach((s) => {
    s.classList.remove("kn-section-focus");
  });
  el.classList.add("kn-section-focus");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
