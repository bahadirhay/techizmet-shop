/** iframe — header ikonları (şeffaf header’da beyaz SVG sorunu) */

import { applyMirrorHeaderMobileFit } from "@/lib/mirror-header-mobile-fit";

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
@media (max-width:991px){
.header--icons-list .kn-locale-icon-item{display:flex!important;align-items:center;margin-right:2px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale{font-size:0;line-height:1;max-height:32px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button{
  position:relative;width:30px;height:30px;min-width:30px;padding:0;
  display:inline-flex;align-items:center;justify-content:center;
  overflow:hidden;color:transparent;font-size:0;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button[data-locale="tr"]::before{content:"TR";font-size:10px;font-weight:700;line-height:1;color:#111}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button[data-locale="en"]::before{content:"EN";font-size:10px;font-weight:700;line-height:1;color:#111}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button.is-active{background:#111}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button.is-active::before{color:#fff}
}
`;

export function applyMirrorHeaderIconsFix(doc: Document) {
  if (!doc.getElementById(STYLE_ID)) {
    const st = doc.createElement("style");
    st.id = STYLE_ID;
    st.textContent = CSS;
    doc.head.appendChild(st);
  }
  applyMirrorHeaderMobileFit(doc);
}
