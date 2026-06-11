/** Admin vitrin önizlemesi — bölüm vurgusu + masaüstü tipografi kilidi */

export const MIRROR_ADMIN_PREVIEW_STYLE_ID = "kn-admin-preview-layout";

export const MIRROR_ADMIN_PREVIEW_CSS = `
html.kn-visual-edit-mode {
  min-width: 1280px;
}
html.kn-visual-edit-mode section.kn-mirror-section.kn-section-focus {
  outline: 3px solid rgba(225, 29, 72, 0.55);
  outline-offset: -3px;
}
/* Dar admin sütunu mobil breakpoint tetiklemesin — canlı vitrin ile aynı font ölçekleri */
@media (max-width: 991px) {
  html.kn-visual-edit-mode:root,
  html.kn-visual-edit-mode {
    --h1: calc(var(--heading_font_scale) * 95px);
    --h2: calc(var(--heading_font_scale) * 75px);
    --h3: calc(var(--heading_font_scale) * 55px);
    --h4: calc(var(--heading_font_scale) * 40px);
    --h5: calc(var(--heading_font_scale) * 30px);
    --h6: calc(var(--heading_font_scale) * 25px);
    --medium_text: calc(var(--body_font_scale) * 16px);
    --text: calc(var(--body_font_scale) * 16px);
  }
}
@media (max-width: 767px) {
  html.kn-visual-edit-mode:root,
  html.kn-visual-edit-mode {
    --h1: calc(var(--heading_font_scale) * 95px);
    --h2: calc(var(--heading_font_scale) * 75px);
    --h3: calc(var(--heading_font_scale) * 55px);
    --h4: calc(var(--heading_font_scale) * 40px);
    --h5: calc(var(--heading_font_scale) * 30px);
    --h6: calc(var(--heading_font_scale) * 25px);
    --medium_text: calc(var(--body_font_scale) * 16px);
    --text: calc(var(--body_font_scale) * 16px);
  }
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
  doc.querySelectorAll("section.kn-mirror-section.kn-section-focus").forEach((s) => {
    s.classList.remove("kn-section-focus");
  });
  el.classList.add("kn-section-focus");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
