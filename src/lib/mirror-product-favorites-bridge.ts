/** Mirror vitrin — ürün kartı ve PDP favori düğmesi */

export const MIRROR_PRODUCT_FAVORITES_STYLE = `<style id="kn-product-favorites-css">
.kn-fav-btn,
.kn-product-card__fav {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: inherit;
}
.kn-fav-btn--on { color: #b91c1c; }
.kn-pdp-fav-wrap {
  margin-top: 0.75rem;
}
.kn-pdp-fav-wrap .kn-fav-btn {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  gap: 0.35rem;
}
</style>`;

export const MIRROR_PRODUCT_FAVORITES_BRIDGE_SCRIPT = `<script id="kn-product-favorites-bridge">(function(){
  function tr(){return document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;}
  function qs(s,r){return (r||document).querySelector(s);}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  var favSlugs=new Set();
  var favIds=new Set();
  var loggedIn=null;
  var busy=false;
  function loginHref(){
    var next=(window.top||window).location.pathname+(window.top||window).location.search||"/";
    return "/account/login?next="+encodeURIComponent(next);
  }
  function setBtnState(btn,on){
    btn.classList.toggle("kn-fav-btn--on",!!on);
    btn.setAttribute("aria-pressed",on?"true":"false");
    btn.textContent=on?"♥":"♡";
    var label=on?(tr()?"Favorilerden çıkar":"Remove favorite"):(tr()?"Favorilere ekle":"Add to favorite");
    btn.setAttribute("title",label);
    btn.setAttribute("aria-label",label);
  }
  function slugFromBtn(btn){
    return (btn.getAttribute("data-product-slug")||"").trim()||null;
  }
  function idFromBtn(btn){
    return (btn.getAttribute("data-product-id")||"").trim()||null;
  }
  function isFav(btn){
    var slug=slugFromBtn(btn);
    if(slug&&favSlugs.has(slug))return true;
    var id=idFromBtn(btn)||(qs('meta[name="kn-product-id"]')&&qs('meta[name="kn-product-id"]').getAttribute("content"));
    return !!(id&&favIds.has(id));
  }
  function syncButtons(){
    qsa("[data-kn-favorite]").forEach(function(btn){setBtnState(btn,isFav(btn));});
  }
  async function loadFavorites(){
    try{
      var res=await fetch("/api/account/favorites",{credentials:"same-origin"});
      if(res.status===401){loggedIn=false;syncButtons();return;}
      if(!res.ok)return;
      var j=await res.json();
      loggedIn=true;
      favIds=new Set(j.productIds||[]);
      favSlugs=new Set(j.slugs||[]);
      syncButtons();
    }catch(e){}
  }
  function ensurePdpButton(){
    var meta=qs('meta[name="kn-product-id"]');
    if(!meta)return;
    var pid=(meta.getAttribute("content")||"").trim();
    if(!pid||qs("[data-kn-favorite][data-kn-pdp]"))return;
    var host=qs("#MainContent purchase-buttons")||qs("#MainContent .product-checkout-buttons")||qs("#MainContent .purchase-buttons");
    if(!host)return;
    var wrap=document.createElement("div");
    wrap.className="kn-pdp-fav-wrap";
    var btn=document.createElement("button");
    btn.type="button";
    btn.className="kn-fav-btn";
    btn.setAttribute("data-kn-favorite","");
    btn.setAttribute("data-kn-pdp","1");
    btn.setAttribute("data-product-id",pid);
    wrap.appendChild(btn);
    host.parentNode.insertBefore(wrap,host.nextSibling);
    setBtnState(btn,isFav(btn));
  }
  async function toggle(btn){
    if(busy)return;
    if(loggedIn===false){
      (window.top||window).location.href=loginHref();
      return;
    }
    if(loggedIn===null)return;
    busy=true;
    var body={};
    var slug=slugFromBtn(btn);
    var pid=idFromBtn(btn);
    if(slug)body.slug=slug;
    else if(pid)body.productId=pid;
  else{
      var meta=qs('meta[name="kn-product-id"]');
      if(meta)body.productId=(meta.getAttribute("content")||"").trim();
    }
    try{
      var res=await fetch("/api/account/favorites",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"same-origin",
        body:JSON.stringify(body)
      });
      if(res.status===401){loggedIn=false;(window.top||window).location.href=loginHref();return;}
      if(!res.ok){alert(tr()?"İşlem başarısız":"Failed");return;}
      var j=await res.json();
      var on=!!j.favorited;
      if(slug){
        if(on)favSlugs.add(slug);else favSlugs.delete(slug);
      }
      if(body.productId){
        if(on)favIds.add(body.productId);else favIds.delete(body.productId);
      }
      if(j.slug){
        if(on)favSlugs.add(j.slug);else favSlugs.delete(j.slug);
      }
      if(j.productId){
        if(on)favIds.add(j.productId);else favIds.delete(j.productId);
      }
      setBtnState(btn,on);
    }catch(e){alert(tr()?"Bağlantı hatası":"Connection error");}
    busy=false;
  }
  document.addEventListener("click",function(e){
    var t=e.target;
  if(!(t instanceof Element))t=t.parentElement;
    if(!t)return;
    var btn=t.closest("[data-kn-favorite]");
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    toggle(btn);
  },true);
  ensurePdpButton();
  loadFavorites();
})();</script>`;

export function injectMirrorProductFavoritesBridge(html: string): string {
  let out = html.replace(/<style id="kn-product-favorites-css">[\s\S]*?<\/style>/i, "");
  out = out.replace(/<script id="kn-product-favorites-bridge">[\s\S]*?<\/script>/i, "");
  out = out.replace(/<\/head>/i, `${MIRROR_PRODUCT_FAVORITES_STYLE}</head>`);
  out = out.replace(/<\/body>/i, `${MIRROR_PRODUCT_FAVORITES_BRIDGE_SCRIPT}</body>`);
  return out;
}
