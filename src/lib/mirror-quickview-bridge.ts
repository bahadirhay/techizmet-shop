/** Quick-view — Shopify section fetch yerine ürün sayfasına yönlendir */

const QUICKVIEW_BRIDGE_SCRIPT = `<script id="kn-quickview-bridge">(function(){
  function productHrefFrom(el){
    var card=el.closest("[data-product-card], .product--card, .horizontal--product-card, .product--wrapper");
    if(!card)return null;
    var link=card.querySelector('a[href*="/products/"]');
    if(!link)return null;
    var href=link.getAttribute("href")||"";
    if(href[0]==="/")return href;
    try{
      var u=new URL(href,window.location.href);
      if(u.origin===window.location.origin)return u.pathname+u.search+u.hash;
    }catch(_e){}
    return null;
  }
  function navigate(href){
    if(!href)return;
    try{(window.top||window).location.href=href;}
    catch(_e){window.location.href=href;}
  }
  document.addEventListener("click",function(e){
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var t=e.target;
    if(!t||!t.closest)return;
    var quick=t.closest(
      "[product-quickview-btn], .product-quickview-button, quick-view, [data-quick-view], .quick-view, .product-quickview"
    );
    if(!quick)return;
    var href=productHrefFrom(quick);
    if(!href)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    navigate(href);
  },true);
  document.querySelectorAll("quick-view-drawer, #QuickView, [id^='QuickView-']").forEach(function(el){
    el.style.display="none";
  });
})();</script>`;

export function injectMirrorQuickviewBridge(html: string): string {
  if (html.includes('id="kn-quickview-bridge"')) return html;
  const out = html.replace(/<script id="kn-quickview-bridge">[\s\S]*?<\/script>/i, "");
  return out.replace(/<\/body>/i, `${QUICKVIEW_BRIDGE_SCRIPT}</body>`);
}
