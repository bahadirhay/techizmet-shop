/** Mirror header — dil seçici + arama/hesap/sepet ikonları (sunucu HTML) */

const HEADER_ICONS_CSS = `
.header--icons-list{display:flex!important;flex-wrap:nowrap;align-items:center;gap:4px}
.header--icons-list>.header--icon-item{flex:0 0 auto}
.header--right{overflow:visible!important;min-width:0}
.header--icons-list .header--icon-link-text{
  color:#1a1a1a!important;
  background:rgba(255,255,255,.95)!important;
  box-shadow:0 1px 6px rgba(0,0,0,.12)!important;
}
.header--icons-list .header--icon-link-text:after{opacity:0!important;pointer-events:none!important}
.header--icons-list .header--icon-link-text svg{
  position:relative!important;
  z-index:1!important;
  display:block!important;
  opacity:1!important;
  visibility:visible!important;
  color:var(--header_icon_color,#1a1a1a)!important;
}
.header--icons-list .header--icon-link-text svg path,
.header--icons-list .header--icon-link-text svg line{
  stroke:currentColor!important;
  fill:none!important;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale{font-size:10px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button{padding:4px 8px}
@media (max-width:991px){
.header--wrapper{grid-template-columns:auto minmax(0,1fr) auto!important;column-gap:6px!important}
.header--logo{max-width:min(var(--logo_width,130px),36vw)!important;margin:4px 0!important}
.header--icons-list .kn-locale-icon-item{display:flex!important;align-items:center;margin-right:2px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale{font-size:0;line-height:1;max-height:32px}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button{
  position:relative;width:30px;height:30px;min-width:30px;padding:0;
  display:inline-flex;align-items:center;justify-content:center;
  overflow:hidden;color:transparent;font-size:0;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button[data-locale="tr"]::before{
  content:"🇹🇷";font-size:15px;line-height:1;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button[data-locale="en"]::before{
  content:"🇬🇧";font-size:15px;line-height:1;
}
.header--icons-list .kn-locale-icon-item .kn-iframe-locale button.is-active{background:#111}
.header--icons-list .header--icon-item{padding:0 1px!important}
.header--icons-list .header--icon-link-text{width:36px!important;height:36px!important;min-width:36px!important}
.header--icons-list .header--icon-item.account{display:flex!important;visibility:visible!important}
}
`;

const HEADER_ICONS_STYLE = `<style id="kn-mirror-header-icons-style">${HEADER_ICONS_CSS}
</style>`;

const SEARCH_LI_CLOSE =
  /(<li class="header--icon-item search">[\s\S]*?<\/list-set>)(\s*)(<li class="header--icon-item account[^>]*>)/g;

const ACCOUNT_LINK_HREF =
  /(<list-set[^>]*data-source="account-drawer"[^>]*>[\s\S]*?<a[^>]*href=")[^"]*(")/gi;

export function patchMirrorHeaderIconsHtml(html: string): string {
  let out = html.replace(SEARCH_LI_CLOSE, "$1</li>$2$3");
  out = out.replace(ACCOUNT_LINK_HREF, '$1#$2');

  if (out.includes("kn-mirror-header-icons-style") || out.includes("kn-header-icons-fix-style")) {
    return out;
  }

  if (out.includes("kn-mirror-locale-style")) {
    out = out.replace(
      /(<style id="kn-mirror-locale-style">)([\s\S]*?)(<\/style>)/i,
      `$1$2${HEADER_ICONS_CSS}$3`,
    );
    return out;
  }

  return out.replace(/<\/head>/i, `${HEADER_ICONS_STYLE}\n</head>`);
}
