/** iframe — header ikonları (şeffaf header’da beyaz SVG sorunu) */

const STYLE_ID = "kn-header-icons-fix-style";

const CSS = `
.header--icons-list{display:flex!important;flex-wrap:nowrap;align-items:center;gap:4px}
.header--icons-list>.header--icon-item{flex:0 0 auto}
.header--right{overflow:visible!important;min-width:0}
.header--icons-list .header--icon-link-text{
  color:#1a1a1a!important;
  background:rgba(255,255,255,.95)!important;
  box-shadow:0 1px 6px rgba(0,0,0,.12)!important;
}
.header--icons-list .header--icon-link-text:after{opacity:0!important}
.header--icons-list .header--icon-link-text svg,
.header--icons-list .header--icon-link-text svg path{
  stroke:#1a1a1a!important;
  color:#1a1a1a!important;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale{font-size:10px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button{padding:4px 8px}
`;

export function applyMirrorHeaderIconsFix(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const st = doc.createElement("style");
  st.id = STYLE_ID;
  st.textContent = CSS;
  doc.head.appendChild(st);
}
