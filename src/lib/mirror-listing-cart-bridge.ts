/** Ana sayfa / koleksiyon kartları — sepete ekle (Shopify tema formu yerine /api/cart/items) */

export const MIRROR_LISTING_CART_BRIDGE_SCRIPT = `<script id="kn-listing-cart-bridge">(function(){
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
  function slugFromCard(card){
    if(!card)return null;
    var handle=card.getAttribute("data-handle");
    if(!handle){
      var vs=card.querySelector("variants-set[data-handle]");
      if(vs)handle=vs.getAttribute("data-handle");
    }
    var fromHandle=normalizeSlug(handle);
    if(fromHandle)return fromHandle;
    var links=card.querySelectorAll('a[href*="/products/"], a[href*="products/"], a[data-handle]');
    for(var i=0;i<links.length;i++){
      var a=links[i];
      var dh=normalizeSlug(a.getAttribute("data-handle"));
      if(dh)return dh;
      var fromHref=slugFromHref(a.getAttribute("href")||"");
      if(fromHref)return fromHref;
    }
    return normalizeSlug(card.getAttribute("data-id"));
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
    return !!btn.closest(".product--card, .horizontal--product-card, .product--wrapper, [data-product-card]");
  }
  function shouldHandle(btn){
    if(!btn.matches("[data-add-to-cart], button[name='add']"))return false;
    if(document.getElementById("kn-product-commerce")){
      return isListingCard(btn);
    }
    return isListingCard(btn)||!!btn.closest("product-form-context, .product--card-form, .product-checkout-buttons");
  }
  function openDrawerUi(){
    if(window.__knOpenCart){window.__knOpenCart();return;}
    var drawer=document.querySelector('[data-drawer="cart-drawer"]');
    if(drawer){
      document.querySelectorAll("[data-drawer]").forEach(function(d){d.removeAttribute("open");d.classList.remove("show","active","open");});
      drawer.classList.add("show");drawer.setAttribute("open","");
      document.body.classList.add("overflow-hidden");
      return;
    }
    try{(window.top||window).location.href="/cart";}catch(e){window.location.href="/cart";}
  }
  async function openCart(prefetched){
    openDrawerUi();
    if(prefetched&&window.__knRenderCartDrawer){
      window.__knCartCache=prefetched;
      window.__knRenderCartDrawer(prefetched);
      return;
    }
    if(window.__knRefreshCart)try{await window.__knRefreshCart();}catch(e){}
  }
  async function addFromListing(btn){
    if(!shouldHandle(btn))return;
    var card=btn.closest("[data-product-card], .product--card, .horizontal--product-card, .product--wrapper");
    var slug=slugFromCard(card);
    var form=btn.closest("form")||btn.closest("product-form-context");
    if(!slug&&form){
      var ctxLink=form.closest(".product--card")&&form.closest(".product--card").querySelector('a[href*="/products/"]');
      if(ctxLink){var m2=(ctxLink.getAttribute("href")||"").match(/\\/products\\/([^/?#]+)/);if(m2)slug=decodeURIComponent(m2[1]);}
    }
    if(!slug){
      var titleLink=btn.closest(".product--card-detail")&&btn.closest(".product--card-detail").querySelector('a[href*="/products/"]');
      if(titleLink){var m3=(titleLink.getAttribute("href")||"").match(/\\/products\\/([^/?#]+)/);if(m3)slug=decodeURIComponent(m3[1]);}
    }
    if(!slug)return;
    var variantLabel=variantLabelFromForm(form);
    btn.disabled=true;
    try{
      var res=await fetch("/api/cart/items",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"same-origin",
        body:JSON.stringify({slug:slug,variantLabel:variantLabel||undefined,qty:1})
      });
      var j={};try{j=await res.json();}catch(e){}
      if(!res.ok){alert(j.error||(tr()?"Sepete eklenemedi":"Could not add to cart"));return;}
      await openCart(j.cart);
    }catch(err){alert(tr()?"Bağlantı hatası":"Connection error");}
    finally{btn.disabled=false;}
  }
  document.addEventListener("click",function(e){
    var el=elFrom(e);if(!el)return;
    var btn=el.closest("[data-add-to-cart], button[name='add']");
    if(!btn||btn.disabled)return;
    if(!shouldHandle(btn))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    addFromListing(btn);
  },true);
  document.addEventListener("submit",function(e){
    var form=e.target;
    if(!(form instanceof HTMLFormElement))return;
    var addBtn=form.querySelector("[data-add-to-cart], button[name='add']");
    if(!addBtn||!shouldHandle(addBtn))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    addFromListing(addBtn);
  },true);
})();</script>`;

export function injectMirrorListingCartBridge(html: string): string {
  if (html.includes('id="kn-listing-cart-bridge"')) return html;
  let out = html.replace(/<script id="kn-listing-cart-bridge">[\s\S]*?<\/script>\s*/i, "");
  return out.replace(/<\/body>/i, `${MIRROR_LISTING_CART_BRIDGE_SCRIPT}</body>`);
}
