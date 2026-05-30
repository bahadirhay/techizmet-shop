/** Mirror ürün sayfası — Shopify kalıntıları, eksik medya, öneri API */

const SHOPIFY_ACCEL_LINK =
  /<link\b[^>]*(?:shopify-accelerated-checkout|portable-wallets\/latest\/accelerated-checkout)[^>]*>/gi;

const SHOPIFY_ACCEL_STYLE =
  /<style\b[^>]*id=["']shopify-accelerated-checkout-cart["'][^>]*>[\s\S]*?<\/style>/gi;

const PORTABLE_WALLETS_INLINE =
  /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?portableWallets(?:Cleanup|NotLoadedAsModule)[\s\S]*?<\/script>/gi;

const SHOPIFY_ACCEL_NOMODULE =
  /<script\b[^>]*\bnomodule\b[^>]*>[\s\S]*?portableWalletsCleanup[\s\S]*?<\/script>/gi;

const SHOPIFY_ACCEL_EL =
  /<shopify-accelerated-checkout\b[\s\S]*?<\/shopify-accelerated-checkout>/gi;

const MISSING_VIDEO_SOURCE =
  /<source\b[^>]*\ssrc=["'][^"']*\/cdn\/shop\/videos\/[^"']*["'][^>]*\/?>/gi;

const PRODUCT_RECS_BRIDGE = `<script id="kn-product-recs-quiet">(function(){
  if(window.__knRecsQuiet)return;
  window.__knRecsQuiet=1;
  var block=/\\/recommendations\\/products/i;
  var f=window.fetch;
  if(typeof f==="function"){
    window.fetch=function(input,init){
      var url=typeof input==="string"?input:(input&&input.url)||"";
      if(block.test(url))return Promise.resolve(new Response("",{status:200,headers:{"Content-Type":"text/html; charset=utf-8"}}));
      return f.apply(this,arguments);
    };
  }
  function hideEmptyRecs(){
    document.querySelectorAll("product-recommendations").forEach(function(el){
      el.removeAttribute("data-url");
      var sec=el.closest(".section-related-products");
      if(sec&&!el.querySelector(".product-card,.card-product,.product-item,swiper-slide"))sec.style.display="none";
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hideEmptyRecs);
  else hideEmptyRecs();
})();</script>`;

/** HTShopify mirror — 404 ve konsol hatalarını azaltır */
export function patchMirrorProductPageHtml(html: string): string {
  let out = html;

  out = out.replace(SHOPIFY_ACCEL_LINK, "");
  out = out.replace(SHOPIFY_ACCEL_STYLE, "");
  out = out.replace(PORTABLE_WALLETS_INLINE, "");
  out = out.replace(SHOPIFY_ACCEL_NOMODULE, "");
  out = out.replace(SHOPIFY_ACCEL_EL, "");
  out = out.replace(MISSING_VIDEO_SOURCE, "");
  out = out.replace(
    /(<video\b[^>]*)\sautoplay\b/gi,
    "$1 data-kn-video-no-autoplay",
  );
  out = out.replace(
    /data-url=["']\/(?:en-us|tr-tr)\/recommendations\/products[^"']*["']/gi,
    'data-url="" data-kn-recs-disabled="1"',
  );

  if (!out.includes('id="kn-product-recs-quiet"')) {
    out = out.replace(/<\/body>/i, `${PRODUCT_RECS_BRIDGE}\n</body>`);
  }

  return out;
}
