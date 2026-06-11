/** Techizmet Shop — sepet sayfası (mirror, native main-cart layout) */

import type { CartView } from "@/lib/cart/types";
import { injectMirrorPageRoot } from "@/lib/mirror-page-inject";

export type MirrorCartPagePayload = {
  cart: CartView;
  locale: "tr" | "en";
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTry(minor: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(minor / 100);
}

const QTY_SVG_DOWN =
  '<svg width="10" height="2" viewBox="0 0 10 2" fill="none"><path d="M0 2L0 0L10 0V2H0Z" fill="currentColor"></path></svg>';
const QTY_SVG_UP =
  '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M0 6L0 4L10 4V6H0Z" fill="currentColor"></path><path d="M4 0L6 0L6 10H4V0Z" fill="currentColor"></path></svg>';
const TRASH_SVG =
  '<svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true"><path d="M1 3.5h12M5.25 3.5V2h3.5v1.5M2.5 3.5V14h9V3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Yalnızca kupon satırı — grid sidebar stilleri kaldırıldı */
export const CART_PAGE_CSS = `<style id="kn-cart-page-css">
.kn-cart-coupon-inline {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px dashed var(--border_color, #e5e2dd);
}
.kn-cart-coupon-inline .kn-cart-coupon-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.kn-cart-coupon-inline .kn-cart-coupon-row input {
  flex: 1;
  min-width: 0;
}
.kn-cart-member-note {
  margin: 0 0 24px;
  padding: 12px 16px;
  background: var(--body_alternate_background, #f7f5f2);
  border-radius: 8px;
}
.kn-cart-free-shipping-under-total {
  text-align: right;
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.4;
}
.kn-cart-free-shipping-under-total--active {
  color: var(--color_success_text, #2e7d32);
  font-weight: 600;
}
@media (max-width: 767px) {
  .section-main-cart.cart-page .section-wrapper.section-spacing {
    padding-bottom: calc(var(--bottom_spacing, 24px) + 40px + env(safe-area-inset-bottom, 0px)) !important;
  }
  .section-main-cart.cart-page .cart-summary-buttons {
    margin-top: 12px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  main:has(.section-main-cart.cart-page) + footer.section-footer .footer--main.border-radius-enabled {
    margin-top: 8px;
  }
}
</style>`;

function discountLabelSuffix(cart: CartView): string {
  if (cart.discountMinor <= 0) return "";
  const label = cart.couponLabel?.trim();
  if (label && label !== "Ücretsiz kargo" && label !== "Free shipping") {
    return ` (${esc(label)})`;
  }
  if (cart.couponCode?.trim()) {
    return ` (${esc(cart.couponCode.trim())})`;
  }
  return "";
}

function buildFreeShippingUnderTotalHtml(cart: CartView, tr: boolean): string {
  if (cart.freeShipping) {
    return `<p class="kn-cart-free-shipping-under-total kn-cart-free-shipping-under-total--active">${tr ? "Ücretsiz kargo" : "Free shipping"}</p>`;
  }
  if (cart.freeShippingThresholdMinor > 0 && cart.freeShippingRemainingMinor > 0) {
    const remaining = esc(formatTry(cart.freeShippingRemainingMinor));
    return `<p class="kn-cart-free-shipping-under-total">${tr ? `Ücretsiz kargo için <strong>${remaining}</strong> daha ekleyin.` : `Add <strong>${remaining}</strong> more for free shipping.`}</p>`;
  }
  return "";
}

function cartLineHtml(line: CartView["items"][number], tr: boolean): string {
  const href = `/products/${encodeURIComponent(line.slug)}`;
  const img = line.imageUrl
    ? `<img class="cart-product-media" src="${esc(line.imageUrl)}" alt="" loading="lazy" width="185" height="185">`
    : `<div class="cart-product-media" style="aspect-ratio:1;background:var(--body_alternate_background)"></div>`;
  const opts = line.variantLabel
    ? `<ul class="cart-product-options text-small"><li>${esc(line.variantLabel)}</li></ul>`
    : "";
  const remove = tr ? "Kaldır" : "Remove";

  return `<div class="cart-product-item" data-kn-cart-line="${esc(line.productId)}:${esc(line.variantId ?? "")}">
    ${img}
    <div class="cart-product-details">
      <a href="${href}" class="product--title text-medium">${esc(line.title)}</a>
      <div class="product--pricing"><span class="product--actual-price">${esc(formatTry(line.unitMinor))}</span></div>
      ${opts}
      <div class="quantity">
        <quantity-set>
          <div class="quantity--inner">
            <button type="button" class="quantity-button quantity--down" aria-label="decrease" data-kn-cart-qty-delta="-1" data-product-id="${esc(line.productId)}" data-variant-id="${esc(line.variantId ?? "")}">${QTY_SVG_DOWN}</button>
            <label class="hidden">${tr ? "Adet" : "Qty"}</label>
            <input type="number" class="quantity-input" min="0" value="${line.qty}" data-kn-qty-val data-product-id="${esc(line.productId)}" data-variant-id="${esc(line.variantId ?? "")}" readonly />
            <button type="button" class="quantity-button quantity--up" aria-label="increase" data-kn-cart-qty-delta="1" data-product-id="${esc(line.productId)}" data-variant-id="${esc(line.variantId ?? "")}">${QTY_SVG_UP}</button>
          </div>
        </quantity-set>
      </div>
    </div>
    <div class="cart-product-price">
      <span class="product--actual-price">${esc(formatTry(line.discountMinor > 0 ? line.lineTotalMinor : line.lineMinor))}</span>
      <button type="button" class="cart-product-remove" aria-label="${esc(remove)}" data-kn-cart-remove data-product-id="${esc(line.productId)}" data-variant-id="${esc(line.variantId ?? "")}">${TRASH_SVG}</button>
    </div>
  </div>`;
}

function buildCartFeaturedMarkup(cart: CartView): string {
  const img = cart.items.find((i) => i.imageUrl)?.imageUrl;
  if (!img) return "";
  return `<div class="cart-featured--item active"><img class="cart-featured--image" src="${esc(img)}" alt="" loading="lazy" width="600" height="800"></div>`;
}

function buildCartBottomMarkup(cart: CartView, tr: boolean): string {
  const couponVal = cart.couponCode ? esc(cart.couponCode) : "";
  const discountSuffix = discountLabelSuffix(cart);

  return `<div class="main-cart--bottom">
    <div class="main-cart--bottom-left">
      <div class="kn-cart-coupon-inline">
        <label class="text-small">${tr ? "Kupon kodu" : "Coupon code"}</label>
        <div class="kn-cart-coupon-row">
          <input class="form-control" type="text" data-kn-coupon-input value="${couponVal}" placeholder="${tr ? "KUPON" : "COUPON"}" />
          <button type="button" class="button medium-button" data-kn-coupon-apply>${tr ? "Uygula" : "Apply"}</button>
        </div>
        ${cart.couponCode ? `<button type="button" class="button text-button" style="margin-top:8px" data-kn-coupon-remove>${tr ? "Kuponu kaldır" : "Remove coupon"} (${couponVal})</button>` : ""}
      </div>
      <div class="cart-note-form">
        <label class="text-medium" for="CartNote">${tr ? "Sipariş notu" : "Order special instructions"}</label>
        <textarea id="CartNote" name="note" class="form-control" rows="5" data-kn-cart-note placeholder="${tr ? "Siparişiniz için özel talimatlar…" : "Special instructions for your order…"}"></textarea>
      </div>
    </div>
    <div class="main-cart--bottom-right">
      <div class="cart-summary-prices">
        <div class="cart-summary-price-item">
          <span>${tr ? "Ara toplam" : "Subtotal"}</span>
          <span data-kn-cart-subtotal>${esc(formatTry(cart.subtotalMinor))}</span>
        </div>
        ${cart.discountMinor > 0 ? `<div class="cart-summary-price-item"><span>${tr ? "İndirim" : "Discount"}${discountSuffix}</span><span data-kn-cart-discount>−${esc(formatTry(cart.discountMinor))}</span></div>` : ""}
        <div class="cart-summary-price-item cart-summary-price-item--total">
          <span class="heading-font kn-cart-total-label">${tr ? "Toplam:" : "Total:"}</span>
          <strong class="heading-font" data-kn-cart-total>${esc(formatTry(cart.totalMinor))}</strong>
        </div>
        ${buildFreeShippingUnderTotalHtml(cart, tr)}
      </div>
      <div class="cart-summary-buttons">
        <a href="/checkout" id="cartCheckout" class="button medium-button button-block">${tr ? "Ödemeye geç" : "Check out"}</a>
      </div>
    </div>
  </div>`;
}

export function buildCartPageMarkup(p: MirrorCartPagePayload): string {
  const tr = p.locale === "tr";
  const cart = p.cart;

  if (!cart.items.length) {
    const empty = tr ? "Sepetiniz boş" : "Your cart is empty";
    const shop = tr ? "Alışverişe devam" : "Continue shopping";
    return `<div class="empty--card" data-kn-cart-page="1">
      <svg viewBox="0 0 47 47" fill="none" aria-hidden="true"><path d="M41.172 38.9473C44.791 34.8113 47 29.422 47 23.5C47 10.5437 36.4563 0 23.5 0C10.5437 0 0 10.5437 0 23.5C0 36.4563 10.5437 47 23.5 47C29.422 47 34.8113 44.791 38.9473 41.172L44.321 46.5457C44.6343 46.8433 45.026 47 45.4333 47C45.8407 47 46.2323 46.8433 46.5457 46.5457C47.1567 45.9347 47.1567 44.9477 46.5457 44.3367L41.172 38.9473ZM3.13333 23.5C3.13333 12.267 12.267 3.13333 23.5 3.13333C34.733 3.13333 43.8667 12.267 43.8667 23.5C43.8667 34.733 34.733 43.8667 23.5 43.8667C12.267 43.8667 3.13333 34.733 3.13333 23.5ZM14.1 18.8C14.1 17.0767 15.51 15.6667 17.2333 15.6667C18.9567 15.6667 20.3667 17.0767 20.3667 18.8C20.3667 20.5233 18.9567 21.9333 17.2333 21.9333C15.51 21.9333 14.1 20.5233 14.1 18.8ZM32.9 18.8C32.9 20.5233 31.49 21.9333 29.7667 21.9333C28.0433 21.9333 26.6333 20.5233 26.6333 18.8C26.6333 17.0767 28.0433 15.6667 29.7667 15.6667C31.49 15.6667 32.9 17.0767 32.9 18.8ZM32.1167 29.1243C32.4613 29.9077 32.1167 30.8477 31.3177 31.1923C31.114 31.2863 30.8947 31.3333 30.691 31.3333C30.0957 31.3333 29.516 30.9887 29.2497 30.3933C28.247 28.106 25.9753 26.6333 23.5 26.6333C21.0247 26.6333 18.753 28.106 17.7347 30.409C17.39 31.1923 16.4657 31.5683 15.6667 31.208C14.8833 30.8633 14.523 29.939 14.8677 29.14C16.3873 25.709 19.787 23.5 23.5 23.5C27.213 23.5 30.6127 25.709 32.1167 29.1243Z" fill="currentColor"/></svg>
      <div class="empty--card-content">
        <h5 class="h5 heading-font empty--card-heading">${esc(empty)}</h5>
        <a class="empty--card-link text-underline" href="/collections/all">${esc(shop)}</a>
      </div>
    </div>`;
  }

  const member =
    cart.memberGroupName && cart.memberDiscountPercent > 0
      ? `<p class="kn-cart-member-note text-medium">${tr ? `${esc(cart.memberGroupName)} üyesi olarak %${cart.memberDiscountPercent} indirim uygulandı.` : `${esc(cart.memberGroupName)} member — ${cart.memberDiscountPercent}% discount applied.`}</p>`
      : "";

  const errors =
    cart.errors.length > 0
      ? `<div class="form--message" style="margin-bottom:20px">${cart.errors.map((e) => `<p>${esc(e)}</p>`).join("")}</div>`
      : "";

  const lines = cart.items.map((line) => cartLineHtml(line, tr)).join("");

  return `<div data-kn-cart-page="1">
  ${member}
  ${errors}
  <form action="/cart" method="post" id="cart" class="main-cart--form" data-kn-cart-form>
    ${lines}
  </form>
  ${buildCartBottomMarkup(cart, tr)}
</div>`;
}

export function injectCartFeaturedColumn(html: string, cart: CartView): string {
  const featured = buildCartFeaturedMarkup(cart);
  let out = html;

  if (!featured) {
    out = out.replace(/\sfeatured-images-enable/g, "");
    out = out.replace(
      /<div class="main-cart--featured-images" id="kn-cart-featured"[^>]*>[\s\S]*?<\/div>/i,
      '<div class="main-cart--featured-images" id="kn-cart-featured" hidden></div>',
    );
    return out;
  }

  if (!out.includes("featured-images-enable")) {
    out = out.replace(
      /class="main-cart--wrapper"/,
      'class="main-cart--wrapper featured-images-enable"',
    );
  }

  out = out.replace(
    /<div class="main-cart--featured-images" id="kn-cart-featured"[^>]*>[\s\S]*?<\/div>/i,
    `<div class="main-cart--featured-images" id="kn-cart-featured">${featured}</div>`,
  );
  return out;
}

export function injectCartPageStyles(html: string): string {
  if (html.includes('id="kn-cart-page-css"')) return html;
  let out = html;
  if (!out.includes("cartcfbd.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/cdn/shop/t/5/assets/cartcfbd.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  return out.replace(/<\/head>/i, `${CART_PAGE_CSS}</head>`);
}

/** Prebuild — oturumsuz kabuk; sepet /api/cart ile istemcide dolar */
export function applyCartShellForPrebuild(html: string, locale: "tr" | "en"): string {
  const tr = locale === "tr";
  const loading = `<p class="kn-cart-loading" style="margin:0;padding:48px 16px;text-align:center;opacity:.85">${
    tr ? "Sepet yükleniyor…" : "Loading cart…"
  }</p>`;
  let out = injectCartPageStyles(html);
  out = injectMirrorPageRoot(out, "kn-page-root", loading);
  return injectCartPageBridge(out, locale);
}

export function applyCartPageToMirrorHtml(html: string, payload: MirrorCartPagePayload): string {
  let out = injectCartPageStyles(html);
  out = injectMirrorPageRoot(out, "kn-page-root", buildCartPageMarkup(payload));
  out = injectCartFeaturedColumn(out, payload.cart);
  out = injectCartPageBridge(out, payload.locale);
  return out;
}

/** İstemci — sepet sayfası anlık render (sunucu buildCartPageMarkup ile uyumlu) */
export function buildCartPageBridgeScript(locale: "tr" | "en"): string {
  return `(function(){
  var TR=${locale === "tr" ? "true" : "false"};
  function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");}
  function formatTry(minor){try{return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(minor/100);}catch(e){return (minor/100).toFixed(2)+" ₺";}}
  function lineKey(line){return line.productId+":"+(line.variantId||"");}
  var TRASH='${TRASH_SVG.replace(/'/g, "\\'")}';
  var qtyDown='${QTY_SVG_DOWN.replace(/'/g, "\\'")}';
  var qtyUp='${QTY_SVG_UP.replace(/'/g, "\\'")}';
  function syncHeaderCounts(cart){
    var count=cart&&cart.itemCount?cart.itemCount:0;
    document.querySelectorAll("[data-cart-items]").forEach(function(el){el.textContent="("+count+")";});
    document.querySelectorAll("[data-cart-count]").forEach(function(el){
      el.textContent=String(count);
      if(count>0)el.classList.remove("hidden");else el.classList.add("hidden");
    });
    var drawer=document.querySelector('[data-drawer="cart-drawer"]');
    if(drawer){
      if(count>0){drawer.classList.add("is-not-empty");drawer.classList.remove("is-empty");}
      else{drawer.classList.remove("is-not-empty");drawer.classList.add("is-empty");}
    }
    if(window.__knCartCache!==undefined)window.__knCartCache=cart;
  }
  function syncFeatured(cart){
    var wrap=document.querySelector("[data-kn-cart-wrapper]");
    var col=document.getElementById("kn-cart-featured");
    if(!wrap||!col)return;
    var img=cart&&cart.items&&cart.items.length?((cart.items.find(function(i){return i.imageUrl;})||cart.items[0]).imageUrl):"";
    if(!img){
      wrap.classList.remove("featured-images-enable");
      col.hidden=true;col.innerHTML="";
      return;
    }
    wrap.classList.add("featured-images-enable");
    col.hidden=false;
    col.innerHTML='<div class="cart-featured--item active"><img class="cart-featured--image" src="'+esc(img)+'" alt="" loading="lazy"></div>';
  }
  function cartLineHtml(line){
    var href="/products/"+encodeURIComponent(line.slug);
    var img=line.imageUrl?'<img class="cart-product-media" src="'+esc(line.imageUrl)+'" alt="" loading="lazy" width="185" height="185">':'<div class="cart-product-media" style="aspect-ratio:1;background:var(--body_alternate_background)"></div>';
    var opts=line.variantLabel?'<ul class="cart-product-options text-small"><li>'+esc(line.variantLabel)+"</li></ul>":"";
    return '<div class="cart-product-item" data-kn-cart-line="'+esc(lineKey(line))+'">'+img+
      '<div class="cart-product-details"><a href="'+href+'" class="product--title text-medium">'+esc(line.title)+'</a><div class="product--pricing"><span class="product--actual-price">'+esc(formatTry(line.unitMinor))+"</span></div>"+opts+
      '<div class="quantity"><quantity-set><div class="quantity--inner">'+
      '<button type="button" class="quantity-button quantity--down" data-kn-cart-qty-delta="-1" data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'">'+qtyDown+"</button>"+
      '<input type="number" class="quantity-input" min="0" value="'+line.qty+'" data-kn-qty-val readonly />'+
      '<button type="button" class="quantity-button quantity--up" data-kn-cart-qty-delta="1" data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'">'+qtyUp+"</button>"+
      "</div></quantity-set></div></div>"+
      '<div class="cart-product-price"><span class="product--actual-price">'+esc(formatTry(line.discountMinor>0?line.lineTotalMinor:line.lineMinor))+'</span>'+
      '<button type="button" class="cart-product-remove" data-kn-cart-remove data-product-id="'+esc(line.productId)+'" data-variant-id="'+esc(line.variantId||"")+'">'+TRASH+"</button></div></div>";
  }
  function discountSuffix(cart){
    if(!cart||cart.discountMinor<=0)return "";
    var label=cart.couponLabel?String(cart.couponLabel).trim():"";
    if(label&&label!=="Ücretsiz kargo"&&label!=="Free shipping")return " ("+esc(label)+")";
    if(cart.couponCode&&String(cart.couponCode).trim())return " ("+esc(String(cart.couponCode).trim())+")";
    return "";
  }
  function bottomHtml(cart){
    var couponVal=cart.couponCode?esc(cart.couponCode):"";
    var discountNote=discountSuffix(cart);
    return '<div class="main-cart--bottom"><div class="main-cart--bottom-left">'+
      '<div class="kn-cart-coupon-inline"><label class="text-small">'+(TR?"Kupon kodu":"Coupon code")+'</label><div class="kn-cart-coupon-row"><input class="form-control" type="text" data-kn-coupon-input value="'+couponVal+'" placeholder="'+(TR?"KUPON":"COUPON")+'" /><button type="button" class="button medium-button" data-kn-coupon-apply>'+(TR?"Uygula":"Apply")+"</button></div>"+
      (cart.couponCode?'<button type="button" class="button text-button" style="margin-top:8px" data-kn-coupon-remove>'+(TR?"Kuponu kaldır":"Remove coupon")+" ("+couponVal+")</button>":"")+"</div>"+
      '<div class="cart-note-form"><label class="text-medium" for="CartNote">'+(TR?"Sipariş notu":"Order special instructions")+'</label><textarea id="CartNote" name="note" class="form-control" rows="5" data-kn-cart-note placeholder="'+(TR?"Siparişiniz için özel talimatlar…":"Special instructions for your order…")+'"></textarea></div></div>'+
      '<div class="main-cart--bottom-right"><div class="cart-summary-prices">'+
      '<div class="cart-summary-price-item"><span>'+(TR?"Ara toplam":"Subtotal")+'</span><span data-kn-cart-subtotal>'+esc(formatTry(cart.subtotalMinor))+"</span></div>"+
      (cart.discountMinor>0?'<div class="cart-summary-price-item"><span>'+(TR?"İndirim":"Discount")+discountNote+'</span><span data-kn-cart-discount>−'+esc(formatTry(cart.discountMinor))+"</span></div>":"")+
      '<div class="cart-summary-price-item cart-summary-price-item--total"><span class="heading-font kn-cart-total-label">'+(TR?"Toplam:":"Total:")+'</span><strong class="heading-font" data-kn-cart-total>'+esc(formatTry(cart.totalMinor))+'</strong></div>'+
      (cart.freeShipping
        ?'<p class="kn-cart-free-shipping-under-total kn-cart-free-shipping-under-total--active">'+(TR?"Ücretsiz kargo":"Free shipping")+"</p>"
        :(cart.freeShippingThresholdMinor>0&&cart.freeShippingRemainingMinor>0
          ?'<p class="kn-cart-free-shipping-under-total">'+(TR?"Ücretsiz kargo için <strong>"+esc(formatTry(cart.freeShippingRemainingMinor))+"</strong> daha ekleyin.":"Add <strong>"+esc(formatTry(cart.freeShippingRemainingMinor))+"</strong> more for free shipping.")+"</p>"
          :""))+'</div>'+
      '<div class="cart-summary-buttons"><a href="/checkout" id="cartCheckout" class="button medium-button button-block">'+(TR?"Ödemeye geç":"Check out")+"</a></div></div></div>";
  }
  function emptyHtml(){
    return '<div class="empty--card" data-kn-cart-page="1"><svg viewBox="0 0 47 47" fill="none" aria-hidden="true"><path d="M41.172 38.9473C44.791 34.8113 47 29.422 47 23.5C47 10.5437 36.4563 0 23.5 0C10.5437 0 0 10.5437 0 23.5C0 36.4563 10.5437 47 23.5 47C29.422 47 34.8113 44.791 38.9473 41.172L44.321 46.5457C44.6343 46.8433 45.026 47 45.4333 47C45.8407 47 46.2323 46.8433 46.5457 46.5457C47.1567 45.9347 47.1567 44.9477 46.5457 44.3367L41.172 38.9473ZM3.13333 23.5C3.13333 12.267 12.267 3.13333 23.5 3.13333C34.733 3.13333 43.8667 12.267 43.8667 23.5C43.8667 34.733 34.733 43.8667 23.5 43.8667C12.267 43.8667 3.13333 34.733 3.13333 23.5Z" fill="currentColor"/></svg><div class="empty--card-content"><h5 class="h5 heading-font empty--card-heading">'+(TR?"Sepetiniz boş":"Your cart is empty")+'</h5><a class="empty--card-link text-underline" href="/collections/all">'+(TR?"Alışverişe devam":"Continue shopping")+"</a></div></div>";
  }
  function buildPageHtml(cart){
    if(!cart||!cart.items||!cart.items.length)return emptyHtml();
    var member=cart.memberGroupName&&cart.memberDiscountPercent>0?'<p class="kn-cart-member-note text-medium">'+(TR?esc(cart.memberGroupName)+" üyesi olarak %"+cart.memberDiscountPercent+" indirim uygulandı.":esc(cart.memberGroupName)+" member — "+cart.memberDiscountPercent+"% discount applied.")+"</p>":"";
    var errors=cart.errors&&cart.errors.length?'<div class="form--message" style="margin-bottom:20px">'+cart.errors.map(function(e){return "<p>"+esc(e)+"</p>";}).join("")+"</div>":"";
    return '<div data-kn-cart-page="1">'+member+errors+'<form action="/cart" method="post" id="cart" class="main-cart--form" data-kn-cart-form>'+
      cart.items.map(cartLineHtml).join("")+"</form>"+bottomHtml(cart)+"</div>";
  }
  function applyCartToPage(cart){
    var root=document.getElementById("kn-page-root");
    if(!root||!cart)return;
    root.innerHTML=buildPageHtml(cart);
    syncFeatured(cart);
    syncHeaderCounts(cart);
    if(typeof window.__knRenderCartDrawer==="function")window.__knRenderCartDrawer(cart);
    else if(window.__knRefreshCart)window.__knRefreshCart();
  }
  function setPageBusy(busy){
    var page=document.querySelector("[data-kn-cart-page]");
    if(page)page.style.opacity=busy?"0.65":"";
    document.querySelectorAll("[data-kn-cart-qty-delta],[data-kn-cart-remove],[data-kn-coupon-apply],[data-kn-coupon-remove]").forEach(function(btn){btn.disabled=busy;});
  }
  async function patchQty(productId,variantId,qty){
    var res=await fetch("/api/cart/items/"+encodeURIComponent(productId),{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({qty:qty,variantId:variantId||null})});
    var j={};try{j=await res.json();}catch(e){}
    if(!res.ok)throw new Error(j.error||"Hata");
    return j.cart;
  }
  async function removeLine(productId,variantId){
    var q=variantId?"?variantId="+encodeURIComponent(variantId):"";
    var res=await fetch("/api/cart/items/"+encodeURIComponent(productId)+q,{method:"DELETE",credentials:"same-origin"});
    var j={};try{j=await res.json();}catch(e){}
    if(!res.ok)throw new Error(j.error||"Hata");
    return j.cart;
  }
  window.__knApplyCartPage=applyCartToPage;
  document.addEventListener("click",async function(e){
    var t=e.target;if(!t||!t.closest)return;
    var rm=t.closest("[data-kn-cart-remove]");
    if(rm){
      e.preventDefault();e.stopPropagation();
      setPageBusy(true);
      try{applyCartToPage(await removeLine(rm.getAttribute("data-product-id"),rm.getAttribute("data-variant-id")));}
      catch(err){alert(err.message||"Hata");}
      finally{setPageBusy(false);}
      return;
    }
    var qb=t.closest("[data-kn-cart-qty-delta]");
    if(qb){
      e.preventDefault();e.stopPropagation();
      var row=qb.closest("[data-kn-cart-line]");
      var valEl=row?row.querySelector("[data-kn-qty-val]"):null;
      var cur=valEl?parseInt(valEl.value,10)||1:1;
      var delta=parseInt(qb.getAttribute("data-kn-cart-qty-delta"),10)||0;
      var next=Math.max(0,cur+delta);
      if(valEl)valEl.value=String(next>0?next:0);
      setPageBusy(true);
      try{applyCartToPage(await patchQty(qb.getAttribute("data-product-id"),qb.getAttribute("data-variant-id"),next));}
      catch(err2){alert(err2.message||"Hata");if(valEl)valEl.value=String(cur);}
      finally{setPageBusy(false);}
      return;
    }
    var ap=t.closest("[data-kn-coupon-apply]");
    if(ap){
      e.preventDefault();e.stopPropagation();
      var inp=document.querySelector("[data-kn-coupon-input]");
      var code=inp?String(inp.value||"").trim().toUpperCase():"";
      setPageBusy(true);
      try{
        var r=await fetch("/api/cart/coupon",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({code:code})});
        var j={};try{j=await r.json();}catch(ex){}
        if(!r.ok){alert(j.error||"Kupon geçersiz");return;}
        applyCartToPage(j.cart);
      }finally{setPageBusy(false);}
      return;
    }
    var cr=t.closest("[data-kn-coupon-remove]");
    if(cr){
      e.preventDefault();e.stopPropagation();
      setPageBusy(true);
      try{
        var r2=await fetch("/api/cart/coupon",{method:"DELETE",credentials:"same-origin"});
        var j2={};try{j2=await r2.json();}catch(ex2){}
        if(r2.ok&&j2.cart)applyCartToPage(j2.cart);
      }finally{setPageBusy(false);}
    }
  },true);
  async function hydrateCartPage(){
    var root=document.getElementById("kn-page-root");
    if(!root)return;
    try{
      var res=await fetch("/api/cart",{credentials:"same-origin"});
      var j={};try{j=await res.json();}catch(e){}
      if(res.ok&&j.cart)applyCartToPage(j.cart);
    }catch(e){}
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",hydrateCartPage);
  }else{
    hydrateCartPage();
  }
})();`;
}

export function injectCartPageBridge(html: string, locale: "tr" | "en"): string {
  const script = `<script id="kn-cart-page-bridge">${buildCartPageBridgeScript(locale)}</script>`;
  let out = html.replace(/<script id="kn-cart-page-bridge">[\s\S]*?<\/script>/i, "");
  if (out.includes('id="kn-cart-page-bridge"')) return out;
  return out.replace(/<\/body>/i, `${script}</body>`);
}
