/** Mirror iframe — tema cart-drawer → /api/cart (oturum sepeti) */

const CART_BRIDGE_SCRIPT = `<script id="kn-cart-bridge">(function(){
  var L={
    bag:function(n){return document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Sepetim ("+n+")":"Your bag ("+n+")";},
    emptyTitle:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Sepetiniz boş":"Your cart is empty",
    emptyLink:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Alışverişe devam":"Continue shopping",
    subtotal:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Ara toplam":"Subtotal",
    viewCart:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Sepeti görüntüle":"View cart",
    checkout:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Ödemeye geç":"Checkout",
    total:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Toplam:":"Total:",
    remove:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Kaldır":"Remove",
    qty:document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0?"Adet":"Qty"
  };
  var TRASH='<svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true"><path d="M1 3.5h12M5.25 3.5V2h3.5v1.5M2.5 3.5V14h9V3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BAG='<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M4 4V3a3 3 0 116 0v1M2 4h10l-.9 8H2.9L2 4z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
  }
  function formatTry(minor){
    try{
      return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(minor/100);
    }catch(e){return (minor/100).toFixed(2)+" ₺";}
  }
  function footerEl(){
    var drawer=document.querySelector('[data-drawer="cart-drawer"]');
    if(!drawer)return null;
    var main=drawer.querySelector(".cart--drawer-main");
    if(!main)return null;
    var foot=main.querySelector("[data-kn-cart-footer]");
    if(!foot){
      foot=document.createElement("div");
      foot.className="cart-drawer--footer";
      foot.setAttribute("data-kn-cart-footer","");
      foot.style.display="none";
      main.appendChild(foot);
    }
    return foot;
  }
  function emptyHtml(){
    return '<div class="empty--card"><svg viewBox="0 0 47 47" fill="none"><path d="M41.172 38.9473C44.791 34.8113 47 29.422 47 23.5C47 10.5437 36.4563 0 23.5 0C10.5437 0 0 10.5437 0 23.5C0 36.4563 10.5437 47 23.5 47C29.422 47 34.8113 44.791 38.9473 41.172L44.321 46.5457C44.6343 46.8433 45.026 47 45.4333 47C45.8407 47 46.2323 46.8433 46.5457 46.5457C47.1567 45.9347 47.1567 44.9477 46.5457 44.3367L41.172 38.9473ZM3.13333 23.5C3.13333 12.267 12.267 3.13333 23.5 3.13333C34.733 3.13333 43.8667 12.267 43.8667 23.5C43.8667 34.733 34.733 43.8667 23.5 43.8667C12.267 43.8667 3.13333 34.733 3.13333 23.5ZM14.1 18.8C14.1 17.0767 15.51 15.6667 17.2333 15.6667C18.9567 15.6667 20.3667 17.0767 20.3667 18.8C20.3667 20.5233 18.9567 21.9333 17.2333 21.9333C15.51 21.9333 14.1 20.5233 14.1 18.8ZM32.9 18.8C32.9 20.5233 31.49 21.9333 29.7667 21.9333C28.0433 21.9333 26.6333 20.5233 26.6333 18.8C26.6333 17.0767 28.0433 15.6667 29.7667 15.6667C31.49 15.6667 32.9 17.0767 32.9 18.8ZM32.1167 29.1243C32.4613 29.9077 32.1167 30.8477 31.3177 31.1923C31.114 31.2863 30.8947 31.3333 30.691 31.3333C30.0957 31.3333 29.516 30.9887 29.2497 30.3933C28.247 28.106 25.9753 26.6333 23.5 26.6333C21.0247 26.6333 18.753 28.106 17.7347 30.409C17.39 31.1923 16.4657 31.5683 15.6667 31.208C14.8833 30.8633 14.523 29.939 14.8677 29.14C16.3873 25.709 19.787 23.5 23.5 23.5C27.213 23.5 30.6127 25.709 32.1167 29.1243Z" fill="currentColor"/></svg><div class="empty--card-content"><h5 class="h5 heading-font empty--card-heading">'+esc(L.emptyTitle)+'</h5><a class="empty--card-link text-underline" href="/collections/all">'+esc(L.emptyLink)+"</a></div></div>";
  }
  function lineHtml(line){
    var img=line.imageUrl?'<img class="cart-product-media" src="'+esc(line.imageUrl)+'" alt="" loading="lazy" width="125" height="125">':'<div class="cart-product-media" style="background:var(--body_alternate_background);aspect-ratio:1"></div>';
    var opts=line.variantLabel?'<ul class="cart-product-options text-small"><li>'+esc(line.variantLabel)+"</li></ul>":"";
    var href="/products/"+encodeURIComponent(line.slug);
    var qtySvgDown='<svg width="10" height="2" viewBox="0 0 10 2" fill="none"><path d="M0 2L0 0L10 0V2H0Z" fill="currentColor"></path></svg>';
    var qtySvgUp='<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M0 6L0 4L10 4V6H0Z" fill="currentColor"></path><path d="M4 0L6 0L6 10H4V0Z" fill="currentColor"></path></svg>';
    return '<div class="cart-product-item" data-kn-line="'+esc(line.productId)+":"+esc(line.variantId||"")+'">'+img+
      '<div class="cart-product-details">'+
      '<a href="'+href+'" class="product--title text-medium">'+esc(line.title)+"</a>"+
      '<div class="product--pricing"><span class="product--actual-price">'+esc(formatTry(line.unitMinor))+"</span></div>"+
      opts+
      '<div class="quantity"><quantity-set><div class="quantity--inner">'+
      '<button type="button" class="quantity-button quantity--down" aria-label="decrease" data-kn-qty-delta="-1" data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'">'+qtySvgDown+"</button>"+
      '<label class="hidden">'+esc(L.qty)+'</label><input type="number" class="quantity-input" min="0" value="'+line.qty+'" data-kn-qty-val data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'" readonly />'+
      '<button type="button" class="quantity-button quantity--up" aria-label="increase" data-kn-qty-delta="1" data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'">'+qtySvgUp+"</button>"+
      "</div></quantity-set></div></div>"+
      '<div class="cart-product-price"><span class="product--actual-price">'+esc(formatTry(line.discountMinor>0?line.lineTotalMinor:line.lineMinor))+'</span>'+
      '<button type="button" class="cart-product-remove" aria-label="'+esc(L.remove)+'" data-kn-remove data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'">'+TRASH+'</button></div></div>';
  }
  function renderCart(cart){
    var count=cart&&cart.itemCount?cart.itemCount:0;
    var items=cart&&cart.items?cart.items:[];
    document.querySelectorAll("[data-cart-items]").forEach(function(el){
      el.textContent="("+count+")";
    });
    document.querySelectorAll("[data-cart-count]").forEach(function(el){
      el.textContent=String(count);
      if(count>0)el.classList.remove("hidden");
      else el.classList.add("hidden");
    });
    var cartAria=document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0
      ?"Sepet, "+count+" ürün"
      :"Cart with "+count+" items";
    document.querySelectorAll('a[aria-label*="Cart"], a[aria-label*="Sepet"]').forEach(function(a){
      a.setAttribute("aria-label",cartAria);
    });
    var drawer=document.querySelector('[data-drawer="cart-drawer"]');
    if(drawer){
      if(count>0){
        drawer.classList.add("is-not-empty");
        drawer.classList.remove("is-empty");
      }else{
        drawer.classList.remove("is-not-empty");
        drawer.classList.add("is-empty");
      }
    }
    var heading=document.querySelector(".cart--drawer-heading");
    if(heading){
      var label=L.bag(count).replace(" ("+count+")","");
      heading.innerHTML=esc(label)+' <span class="text-large" data-cart-items="">('+count+")</span>";
    }
    var body=document.querySelector("[data-cart-drawer-body]");
    if(body){
      if(!items.length){
        body.classList.add("is-empty");
        body.innerHTML=emptyHtml();
      }else{
        body.classList.remove("is-empty");
        body.innerHTML=items.map(lineHtml).join("");
      }
    }
    var foot=footerEl();
    if(foot){
      if(!items.length){
        foot.style.display="none";
        foot.innerHTML="";
      }else{
        foot.style.display="";
        var sub=cart.subtotalMinor!=null?cart.subtotalMinor:0;
        var total=cart.totalMinor!=null?cart.totalMinor:sub;
        foot.innerHTML='<div class="cart-drawer--footer-content">'+
          '<div class="cart-summary-price-item"><span>'+esc(L.subtotal)+'</span><span data-kn-subtotal>'+esc(formatTry(sub))+'</span></div>'+
          '<div class="cart-summary-price-item cart-summary-price-item--total"><span class="kn-cart-total-label heading-font">'+esc(L.total)+'</span><strong class="heading-font" data-kn-cart-total>'+esc(formatTry(total))+'</strong></div>'+
          '<div class="cart-drawer-buttons"><a href="/cart" class="button medium-button button-secondary button-block">'+esc(L.viewCart)+'</a><a href="/checkout" class="button medium-button button-block cart-checkout-btn">'+BAG+'<span>'+esc(L.checkout)+' '+esc(formatTry(total))+'</span></a></div></div>';
      }
    }
  }
  async function patchQty(productId,variantId,qty){
    var url="/api/cart/items/"+encodeURIComponent(productId);
    var res=await fetch(url,{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      credentials:"same-origin",
      body:JSON.stringify({qty:qty,variantId:variantId||null})
    });
    var j={};
    try{j=await res.json();}catch(e){}
    if(!res.ok)throw new Error(j.error||"Sepet güncellenemedi");
    return j.cart;
  }
  async function removeLine(productId,variantId){
    var q=variantId?"?variantId="+encodeURIComponent(variantId):"";
    var res=await fetch("/api/cart/items/"+encodeURIComponent(productId)+q,{
      method:"DELETE",
      credentials:"same-origin"
    });
    var j={};
    try{j=await res.json();}catch(e){}
    if(!res.ok)throw new Error(j.error||"Kaldırılamadı");
    return j.cart;
  }
  var syncing=false;
  async function refreshCart(){
    if(syncing)return window.__knCartCache||null;
    syncing=true;
    try{
      var res=await fetch("/api/cart",{credentials:"same-origin"});
      var j={};
      try{j=await res.json();}catch(e){}
      if(res.ok&&j.cart){
        window.__knCartCache=j.cart;
        renderCart(j.cart);
        return j.cart;
      }
    }catch(e){}
    finally{syncing=false;}
    return window.__knCartCache||null;
  }
  window.__knRefreshCart=refreshCart;
  window.__knRenderCartDrawer=renderCart;
  window.__knOpenCart=function(){
    var drawer=document.querySelector('[data-drawer="cart-drawer"]');
    if(!drawer){(window.top||window).location.href="/cart";return;}
    document.querySelectorAll("[data-drawer]").forEach(function(d){
      d.removeAttribute("open");
      d.classList.remove("show","active","open");
    });
    drawer.classList.add("show");
    drawer.setAttribute("open","");
    document.body.classList.add("overflow-hidden");
  };
  document.addEventListener("click",function(e){
    var t=e.target;
    if(!t||!t.closest)return;
    var rm=t.closest("[data-kn-remove]");
    if(rm){
      e.preventDefault();
      e.stopPropagation();
      removeLine(rm.getAttribute("data-product-id"),rm.getAttribute("data-variant-id")).then(renderCart).catch(function(){});
      return;
    }
    var qb=t.closest("[data-kn-qty-delta]");
    if(qb){
      e.preventDefault();
      e.stopPropagation();
      var row=qb.closest("[data-kn-line]")||qb.closest(".cart-product-item");
      var valEl=row?row.querySelector("[data-kn-qty-val]"):null;
      var cur=valEl?(parseInt(valEl.value,10)||parseInt(valEl.textContent,10)||1):1;
      var delta=parseInt(qb.getAttribute("data-kn-qty-delta"),10)||0;
      var next=Math.max(0,cur+delta);
      patchQty(qb.getAttribute("data-product-id"),qb.getAttribute("data-variant-id"),next).then(renderCart).catch(function(){});
    }
  },true);
  function isCartPage(){
    return !!document.getElementById("kn-page-root")&&!!document.querySelector("[data-kn-cart-wrapper],[data-kn-cart-outer]");
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){if(!isCartPage())refreshCart();});
  }else{
    if(!isCartPage())refreshCart();
  }
})();</script>`;

export function injectMirrorCartBridge(html: string): string {
  if (html.includes('id="kn-cart-bridge"')) return html;
  let out = html.replace(/<script id="kn-cart-bridge">[\s\S]*?<\/script>/i, "");
  return out.replace(/<\/body>/i, `${CART_BRIDGE_SCRIPT}</body>`);
}
