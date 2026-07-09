/** Ana sayfa / koleksiyon kartları — sepete ekle (Shopify tema formu yerine /api/cart/items) */

/** Sadece IIFE gövdesi (<script> sarmalayıcısı olmadan) — React inline script için */
export const MIRROR_LISTING_CART_BRIDGE_JS = `(function(){
  function tr(){return document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;}
  function elFrom(e){var t=e.target;if(t instanceof Element)return t;if(t&&t.parentElement)return t.parentElement;return null;}
  function normalizeSlug(raw){
    if(!raw)return null;
    var s=String(raw).trim();
    if(!s||/^\\d+$/.test(s))return null;
    s=s.replace(/\\.html$/i,"");
    return s||null;
  }
  function slugFromHref(href){
    if(!href)return null;
    var m=String(href).match(/\\/products\\/([^/?#]+)/i);
    if(m)return normalizeSlug(decodeURIComponent(m[1]));
    m=String(href).match(/products\\/([^/?#]+)\\.html/i);
    if(m)return normalizeSlug(decodeURIComponent(m[1]));
    return null;
  }
  function listingCardRoot(el){
    return el&&el.closest(".product--card, .horizontal--product-card, .product--wrapper, .product-grid-card, [data-product-card]");
  }
  function slugFromCard(card){
    if(!card)return null;
    var handle=card.getAttribute("data-handle");
    if(!handle){
      var vs=card.querySelector("variants-set[data-handle]");
      if(vs)handle=vs.getAttribute("data-handle");
    }
    var fromHandle=normalizeSlug(handle);
    if(fromHandle)return fromHandle;
    var fromId=normalizeSlug(card.getAttribute("data-id"));
    if(fromId)return fromId;
    var links=card.querySelectorAll('a[href*="/products/"], a[href*="products/"], [data-handle]');
    for(var i=0;i<links.length;i++){
      var a=links[i];
      var dh=normalizeSlug(a.getAttribute("data-handle"));
      if(dh)return dh;
      var fromHref=slugFromHref(a.getAttribute("href")||"");
      if(fromHref)return fromHref;
    }
    return null;
  }
  function slugFromControl(btn){
    if(!btn)return null;
    return normalizeSlug(btn.getAttribute("data-handle"))||
      normalizeSlug(btn.closest("[data-handle]")&&btn.closest("[data-handle]").getAttribute("data-handle"))||
      slugFromCard(listingCardRoot(btn));
  }
  function variantLabelFromForm(form){
    if(!form)return null;
    var sel=form.querySelector('select[name="id"]');
    if(sel&&sel.selectedOptions&&sel.selectedOptions[0]){
      var t=(sel.selectedOptions[0].textContent||"").trim();
      var dash=t.indexOf(" - ");
      return dash>0?t.slice(0,dash).trim():t;
    }
    var chk=form.querySelector('input.productOption:checked');
    if(chk&&chk.value)return String(chk.value).trim();
    var active=form.querySelector(".variant--item.active input.productOption, .variant--item.selected input.productOption");
    if(active&&active.value)return String(active.value).trim();
    return null;
  }
  function isListingCard(btn){
    return !!listingCardRoot(btn);
  }
  function isAddControl(el){
    return !!el.closest("[data-add-to-cart], button[name='add'], a.product--icon");
  }
  function isQuickViewControl(el){
    return !!el.closest("[product-quickview-btn], .product-quickview-button, quick-view, [data-quick-view]");
  }
  function shouldHandle(btn){
    if(!btn.matches("[data-add-to-cart], button[name='add'], a.product--icon"))return false;
    if(isQuickViewControl(btn))return false;
    if(document.getElementById("kn-product-commerce")){
      return isListingCard(btn);
    }
    return isListingCard(btn)||!!btn.closest("product-form-context, .product--card-form, .product-checkout-buttons");
  }
  function neutralizeListingForms(){
    document.querySelectorAll("#MainContent .product--card [name='add'], #MainContent [data-product-card] [name='add'], #MainContent [data-product-card] [data-add-to-cart]").forEach(function(btn){
      if(btn.tagName==="BUTTON")btn.setAttribute("type","button");
    });
    document.querySelectorAll("#MainContent .product--card form, #MainContent [data-product-card] form").forEach(function(form){
      form.setAttribute("action","#");
      form.setAttribute("onsubmit","return false");
    });
  }
  function topWin(){try{return window.top&&window.top!==window?window.top:null;}catch(e){return null;}}
  function cartTargetWindow(){
    try{
      if(document.querySelector('[data-drawer="cart-drawer"]'))return window;
      var top=topWin();
      if(top){
        try{
          if(top.document.querySelector('[data-drawer="cart-drawer"]'))return top;
        }catch(e){}
      }
    }catch(e){}
    return window;
  }
  function openDrawerIn(win){
    try{
      var doc=win.document;
      var drawer=doc.querySelector('[data-drawer="cart-drawer"]');
      if(!drawer)return false;
      doc.querySelectorAll("[data-drawer]").forEach(function(d){
        d.removeAttribute("open");
        d.classList.remove("show","active","open");
      });
      drawer.classList.add("show");
      drawer.setAttribute("open","");
      doc.body.classList.add("overflow-hidden");
      return true;
    }catch(e){return false;}
  }
  function renderCartIn(win,cart){
    if(!win||!cart)return;
    try{
      win.__knCartCache=cart;
      if(typeof win.__knRenderCartDrawer==="function")win.__knRenderCartDrawer(cart);
    }catch(e){}
  }
  function openDrawerUi(){
    var target=cartTargetWindow();
    if(openDrawerIn(target))return;
    var top=topWin();
    if(top&&top!==target&&openDrawerIn(top))return;
    if(top&&top.__knOpenCart){top.__knOpenCart();return;}
    if(window.__knOpenCart){window.__knOpenCart();return;}
    try{(top||window).location.href="/cart";}catch(e){window.location.href="/cart";}
  }
  async function openCart(prefetched){
    var target=cartTargetWindow();
    if(prefetched){
      renderCartIn(target,prefetched);
      if(target!==window&&document.querySelector("[data-cart-drawer-body]")){
        renderCartIn(window,prefetched);
      }
    }else if(typeof target.__knRefreshCart==="function"){
      try{await target.__knRefreshCart();}catch(e){}
    }
    if(!openDrawerIn(target)){
      openDrawerUi();
    }
  }
  async function addToCart(slug,variantLabel,control){
    if(!slug)return false;
    if(control){
      control.disabled=true;
      if(control.style)control.style.pointerEvents="none";
    }
    try{
      var res=await fetch("/api/cart/items",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"same-origin",
        body:JSON.stringify({slug:slug,variantLabel:variantLabel||undefined,qty:1})
      });
      var j={};try{j=await res.json();}catch(e){}
      if(!res.ok){alert(j.error||(tr()?"Sepete eklenemedi":"Could not add to cart"));return false;}
      await openCart(j.cart);
      return true;
    }catch(err){alert(tr()?"Bağlantı hatası":"Connection error");return false;}
    finally{
      if(control){
        control.disabled=false;
        if(control.style)control.style.pointerEvents="";
      }
    }
  }
  async function addFromListing(btn){
    if(!shouldHandle(btn))return;
    var slug=slugFromControl(btn);
    var form=btn.closest("form")||btn.closest("product-form-context");
    if(!slug)slug=slugFromCard(listingCardRoot(btn));
    if(!slug)return;
    var variantLabel=variantLabelFromForm(form);
    await addToCart(slug,variantLabel,btn);
  }
  async function addFromProductIconLink(a){
    var slug=slugFromHref(a.getAttribute("href")||"")||slugFromControl(a);
    if(!slug)return;
    await addToCart(slug,null,a);
  }
  document.addEventListener("click",function(e){
    var el=elFrom(e);if(!el)return;
    if(!isAddControl(el)||isQuickViewControl(el))return;
    if(!isListingCard(el))return;
    var iconLink=el.closest("a.product--icon");
    if(iconLink&&!iconLink.hasAttribute("data-add-to-cart")){
      var href=iconLink.getAttribute("href")||"";
      if(href.indexOf("/products/")>=0||href.match(/products\\/[^/?#]+\\.html/i)||iconLink.getAttribute("data-handle")){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        addFromProductIconLink(iconLink);
        return;
      }
    }
    var btn=el.closest("[data-add-to-cart], button[name='add']");
    if(!btn||btn.disabled||!shouldHandle(btn))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    addFromListing(btn);
  },true);
  document.addEventListener("submit",function(e){
    var form=e.target;
    if(!(form instanceof HTMLFormElement))return;
    if(!listingCardRoot(form))return;
    var addBtn=form.querySelector("[data-add-to-cart], button[name='add']");
    if(!addBtn||!shouldHandle(addBtn))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    addFromListing(addBtn);
  },true);
  function boot(){
    neutralizeListingForms();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();`;

export const MIRROR_LISTING_CART_BRIDGE_SCRIPT = `<script id="kn-listing-cart-bridge">${MIRROR_LISTING_CART_BRIDGE_JS}</script>`;

export function injectMirrorListingCartBridge(html: string): string {
  if (html.includes('id="kn-listing-cart-bridge"')) return html;
  let out = html.replace(/<script id="kn-listing-cart-bridge">[\s\S]*?<\/script>\s*/i, "");
  return out.replace(/<\/body>/i, `${MIRROR_LISTING_CART_BRIDGE_SCRIPT}</body>`);
}
