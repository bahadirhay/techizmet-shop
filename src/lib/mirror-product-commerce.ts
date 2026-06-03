/** İstemci + sunucu — mirror PDP fiyat / sepet (DOM yaması, fs/prisma yok) */

import type { ProductSharePayload } from "@/lib/product-share";
import { injectMirrorProductShareHtml } from "@/lib/mirror-product-share";

export type MirrorProductCommerceTexts = {
  startingPricePrefix?: string;
};

export type MirrorProductCommercePayload = {
  productId: string;
  slug: string;
  variants: Array<{
    id: string;
    label: string;
    optionValues: string[];
    priceLabel: string;
    compareLabel: string | null;
    stockQty: number;
  }>;
  defaultVariantId: string | null;
  priceLabel: string;
  compareLabel: string | null;
  fromPrice: boolean;
  inStock: boolean;
  texts?: MirrorProductCommerceTexts;
  share?: ProductSharePayload;
};

function buildCommerceScript(data: MirrorProductCommercePayload): string {
  const json = JSON.stringify(data);
  return `(function(){
  var DATA=${json};
  var TEXTS=DATA.texts||{};
  function startingPriceText(price){return (TEXTS.startingPricePrefix||'Başlayan fiyat')+': '+price;}
  function qs(s,r){return (r||document).querySelector(s);}
  function qsa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function norm(s){return String(s||'').trim().toLowerCase();}
  function mainVariantsSet(){
    var sets=qsa('#MainContent variants-set[data-page="product"]');
    for(var i=0;i<sets.length;i++){
      var sec=sets[i].getAttribute('data-section')||'';
      if(sec.indexOf('quick-view')<0&&sec.indexOf('drawer')<0)return sets[i];
    }
    return qs('#MainContent .product--variants-options variants-set[data-page="product"]');
  }
  function readCheckedValues(set){
    var values=[];
    if(!set)return values;
    set.querySelectorAll('input.productOption:checked').forEach(function(inp){
      if(inp.value)values.push(inp.value.trim());
    });
    if(values.length)return values;
    set.querySelectorAll('.variant--item').forEach(function(item){
      var inp=item.querySelector('input.productOption');
      if(!inp||!inp.value)return;
      if(item.classList.contains('active')||item.classList.contains('selected')||
         inp.getAttribute('aria-checked')==='true'){
        values.push(inp.value.trim());
      }
    });
    return values;
  }
  function matchVariant(values){
    if(!values.length)return null;
    var key=values.join(' / ');
    var found=DATA.variants.find(function(v){return v.label===key;})||
      DATA.variants.find(function(v){return v.optionValues.join(' / ')===key;});
    if(found)return found;
    if(values.length===1){
      var one=values[0];
      found=DATA.variants.find(function(v){
        return v.optionValues.length===1&&v.optionValues[0]===one;
      })||DATA.variants.find(function(v){return v.label===one;})||
        DATA.variants.find(function(v){return norm(v.label)===norm(one);});
    }
  return found||null;
  }
  function selectedVariant(){
    if(!DATA.variants.length)return null;
    var set=mainVariantsSet();
    var values=readCheckedValues(set);
    var v=matchVariant(values);
    if(v)return v;
    if(DATA.defaultVariantId){
      return DATA.variants.find(function(x){return x.id===DATA.defaultVariantId;})||DATA.variants[0];
    }
    return DATA.variants[0]||null;
  }
  function mainPriceEl(){
    return qs('#MainContent [id^="price--wrapper-template"] .product--actual-price')||
      qs('#MainContent .product--pricing .product--actual-price');
  }
  function stickyPriceEl(){
    return qs('.sticky-buy-button-wrapper .product--actual-price')||
      qs('sticky-buy-button .product--actual-price');
  }
  function stickyVariantTitleEl(){
    return qs('.sticky-buy-button-wrapper .product--variant-title')||
      qs('sticky-buy-button .product--variant-title');
  }
  function syncStickyImageFromMain(){
    var main=qs('#MainContent .main--product-image-slider-outer img, #MainContent .main--product-item img');
    var stickyImg=qs('.sticky-buy-button-wrapper .sticky--product-image img')||
      qs('sticky-buy-button .sticky--product-image img');
    if(!main||!stickyImg)return;
    var u=main.getAttribute('data-original')||main.src;
    if(!u)return;
    var bust=u+(u.indexOf('?')>=0?'&':'?')+'kn='+Date.now();
    stickyImg.src=bust;
    stickyImg.setAttribute('data-original',u);
    stickyImg.setAttribute('data-src',u);
    stickyImg.removeAttribute('lazyload');
    stickyImg.classList.remove('lazyload');
  }
  function mainCutEl(){
    return qs('#MainContent [id^="price--wrapper-template"] .product--cut-price');
  }
  function updatePrice(){
    var v=selectedVariant();
    var el=mainPriceEl();
    if(el){
      if(v){
        el.textContent=v.priceLabel;
      }else{
        el.textContent=DATA.fromPrice?startingPriceText(DATA.priceLabel):DATA.priceLabel;
      }
    }
    var stickyEl=stickyPriceEl();
    if(stickyEl){
      if(v){
        stickyEl.textContent=v.priceLabel;
      }else{
        stickyEl.textContent=DATA.fromPrice?startingPriceText(DATA.priceLabel):DATA.priceLabel;
      }
    }
    var stickyVar=stickyVariantTitleEl();
    if(stickyVar){
      if(v&&v.label){
        stickyVar.textContent=v.label;
        stickyVar.style.display='';
      }else if(!DATA.variants.length){
        stickyVar.textContent='';
        stickyVar.style.display='none';
      }
    }
    if(el){
      var cut=mainCutEl();
      if(cut){
        if(v&&v.compareLabel){cut.textContent=v.compareLabel;cut.style.display='';}
        else cut.style.display='none';
      }
    }
    syncStickyImageFromMain();
    var addBtns=qsa('[data-add-to-cart], button[name="add"]');
    var stock=v?v.stockQty>0:DATA.inStock;
    addBtns.forEach(function(b){
      b.disabled=!stock;
      b.setAttribute('aria-disabled',stock?'false':'true');
    });
  }
  function bindVariantUi(){
    var set=mainVariantsSet();
    if(!set)return;
    set.querySelectorAll('input.productOption').forEach(function(inp){
      inp.addEventListener('change',updatePrice);
    });
    set.querySelectorAll('label.variant-item-name').forEach(function(lbl){
      lbl.addEventListener('click',function(){
        var id=lbl.getAttribute('for');
        if(!id)return;
        var inp=document.getElementById(id);
        if(inp&&inp.classList.contains('productOption')){
          inp.checked=true;
          updatePrice();
        }
      });
    });
  }
  bindVariantUi();
  updatePrice();
  function openDrawerUi(){
    if(window.__knOpenCart){window.__knOpenCart();return;}
    var drawer=document.querySelector('[data-drawer="cart-drawer"]');
    if(drawer){
      document.querySelectorAll('[data-drawer]').forEach(function(d){
        d.removeAttribute('open');d.classList.remove('show','active','open');
      });
      drawer.classList.add('show');drawer.setAttribute('open','');
      document.body.classList.add('overflow-hidden');
      return;
    }
    (window.top||window).location.href='/cart';
  }
  async function openCart(prefetched){
    openDrawerUi();
    if(prefetched&&window.__knRenderCartDrawer){
      window.__knCartCache=prefetched;
      window.__knRenderCartDrawer(prefetched);
      return;
    }
    if(window.__knRefreshCart)await window.__knRefreshCart();
  }
  async function addToCart(e){
    if(e){e.preventDefault();e.stopImmediatePropagation();}
    var v=selectedVariant();
    if(DATA.variants.length&&!v){alert('Lütfen bir seçenek seçin.');return;}
    if(v&&v.stockQty<1){alert('Bu seçenek tükendi.');return;}
    if(!DATA.variants.length&&!DATA.inStock){alert('Ürün tükendi.');return;}
    try{
      var res=await fetch('/api/cart/items',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({productId:DATA.productId,variantId:v?v.id:null,qty:1})
      });
      var j=await res.json();
      if(!res.ok){alert(j.error||'Sepete eklenemedi');return;}
      await openCart(j.cart);
    }catch(err){alert('Bağlantı hatası');}
  }
  qsa('[data-add-to-cart], button[name="add"]').forEach(function(btn){
    var sec=btn.closest('variants-set');
    if(sec){
      var sid=sec.getAttribute('data-section')||'';
      if(sid.indexOf('quick-view')>=0||sid.indexOf('drawer')>=0)return;
    }
    if(!btn.closest('#MainContent'))return;
    btn.addEventListener('click',addToCart,true);
  });
})();`;
}

/** Sunucu — mirror ürün HTML’ine sepet köprüsü */
export function injectMirrorProductCommerceHtml(html: string, data: MirrorProductCommercePayload): string {
  const script = `<script id="kn-product-commerce">${buildCommerceScript(data)}</script>`;
  let out = html.replace(/<script id="kn-product-commerce">[\s\S]*?<\/script>/i, "");
  out = out.replace(/<\/body>/i, `${script}</body>`);
  if (data.share) out = injectMirrorProductShareHtml(out, data.share);
  return out;
}

export function applyMirrorProductCommerce(doc: Document, data: MirrorProductCommercePayload) {
  doc.getElementById("kn-product-commerce")?.remove();

  for (const v of data.variants) {
    if (v.stockQty > 0) continue;
    for (const val of v.optionValues) {
      doc.querySelectorAll("input.productOption").forEach((inp) => {
        if (inp instanceof HTMLInputElement && inp.value.trim() === val) {
          inp.closest(".variant--item")?.setAttribute("data-option-disabled", "true");
        }
      });
    }
  }

  const el = mainPriceElSafe(doc);
  if (el) {
    const prefix = data.texts?.startingPricePrefix?.trim() || "Başlayan fiyat";
    el.textContent = data.fromPrice ? `${prefix}: ${data.priceLabel}` : data.priceLabel;
  }

  const stickyPrice = doc.querySelector(
    ".sticky-buy-button-wrapper .product--actual-price, sticky-buy-button .product--actual-price",
  );
  if (stickyPrice) {
    const prefix = data.texts?.startingPricePrefix?.trim() || "Başlayan fiyat";
    stickyPrice.textContent = data.fromPrice ? `${prefix}: ${data.priceLabel}` : data.priceLabel;
  }

  const script = doc.createElement("script");
  script.id = "kn-product-commerce";
  script.textContent = buildCommerceScript(data);
  doc.body.appendChild(script);
}

function mainPriceElSafe(doc: Document) {
  return (
    doc.querySelector('#MainContent [id^="price--wrapper-template"] .product--actual-price') ??
    doc.querySelector("#MainContent .product--pricing .product--actual-price")
  );
}
