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
@media (max-width:1024px){
.hamburger--toggler.mobile-toggler,
[data-mobile-toggler]{
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
}
.hamburger--toggler-icon .line,
.header.mobile-transparent .hamburger--toggler-icon .line,
.header:not(.is-sticky).mobile-transparent .hamburger--toggler-icon .line{
  background:#1a1a1a!important;
}
.header--icons-list .kn-locale-icon-item{display:flex!important;flex:0 0 auto!important;align-items:center!important}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale{
  display:inline-flex!important;align-items:center!important;gap:0!important;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button{
  position:relative;width:26px;height:26px;min-width:26px;padding:0;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:9px;font-weight:700;line-height:1;color:#111;background:transparent;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button.is-active{background:#111;border-radius:4px;color:#fff}
.header--icons-list>.header--icon-item.account,
.header--icons-list .header--icon-item.account{display:flex!important;visibility:visible!important;flex:0 0 auto!important}
.header--icons-list .header--icon-item{padding:0 1px!important}
.header--icons-list .header--icon-link-text{width:32px!important;height:32px!important;min-width:32px!important}
}
`;

export function applyMirrorHeaderIconsFix(doc: Document) {
  let st = doc.getElementById(STYLE_ID);
  if (!st) {
    st = doc.createElement("style");
    st.id = STYLE_ID;
    doc.head.appendChild(st);
  }
  st.textContent = CSS;
  applyMirrorHeaderMobileFit(doc);
}
