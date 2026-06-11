/** Özellik kartları widget CSS — .kn-custom-block-root üzerinde (kn-custom-blocks-root yok) */

export const FEATURE_CARDS_WIDGET_CSS = `
.kn-custom-block-root.kn-cb-section{margin:0;padding:0;max-width:none}
.kn-custom-block-root.kn-cb-feature-cards{
  width:100%;box-sizing:border-box;padding:48px 20px 56px;background:#faf7f2;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-header{
  text-align:center;max-width:720px;margin:0 auto 36px;padding:0 8px;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-header h2{
  font-size:clamp(1.5rem,2.5vw,1.875rem)!important;font-weight:700!important;
  line-height:1.25!important;margin:0 0 12px!important;color:#111!important;
  text-transform:none!important;letter-spacing:normal!important;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-header p{
  font-size:1rem!important;line-height:1.6!important;color:#64748b!important;
  margin:0!important;text-transform:none!important;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-grid{
  display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;
  gap:20px!important;max-width:1280px;margin:0 auto!important;width:100%;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-card{
  background:#fff!important;border-radius:16px!important;
  box-shadow:0 8px 32px rgba(15,23,42,.08)!important;
  padding:28px 24px 24px!important;display:flex!important;flex-direction:column!important;
  align-items:flex-start!important;text-decoration:none!important;color:inherit!important;
  border:none!important;min-width:0;
}
.kn-custom-block-root.kn-cb-feature-cards a.kn-fc-card:hover{
  text-decoration:none!important;color:inherit!important;
  box-shadow:0 12px 36px rgba(15,23,42,.12)!important;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-icon{
  width:52px;height:52px;margin-bottom:18px;padding-top:4px;
  border-top:3px solid transparent;display:flex;align-items:flex-end;justify-content:flex-start;
  flex-shrink:0;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-card:first-child .kn-fc-icon{
  border-top-color:#c9a227;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-icon img,
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-icon svg{
  width:48px;height:48px;object-fit:contain;display:block;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-icon--text{
  font-size:1.75rem;font-weight:800;line-height:1;color:#111;letter-spacing:-.02em;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-card h3{
  font-size:1.125rem!important;font-weight:700!important;line-height:1.35!important;
  margin:0 0 10px!important;color:#111!important;text-transform:none!important;
}
.kn-custom-block-root.kn-cb-feature-cards .kn-fc-card p{
  font-size:.9375rem!important;line-height:1.55!important;color:#64748b!important;
  margin:0!important;
}
@media(max-width:1024px){
  .kn-custom-block-root.kn-cb-feature-cards .kn-fc-grid{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
  }
}
@media(max-width:640px){
  .kn-custom-block-root.kn-cb-feature-cards{padding:32px 16px 40px}
  .kn-custom-block-root.kn-cb-feature-cards .kn-fc-grid{
    grid-template-columns:1fr!important;
  }
}
`;
