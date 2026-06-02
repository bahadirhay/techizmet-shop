/** Mirror iframe — internal storefront links should open in the top window */

const LINK_BRIDGE_SCRIPT = `<script id="kn-link-bridge">(function(){
  function parseHrefParts(href){
    var m=String(href||"").match(/^([^?#]*)(\\?[^#]*)?(#.*)?$/);
    return {path:(m&&m[1])||"",search:(m&&m[2])||"",hash:(m&&m[3])||""};
  }
  function isProductContext(a){
    return !!a.closest([
      "[data-product-card]",
      ".product-grid-card",
      ".discover-list",
      ".horizontal--product-card",
      ".product--card-inner",
      ".predictive-search--products-list",
      ".main--collection--products-list",
      ".main-collection--products-list",
      ".product--wrapper",
      "product-set"
    ].join(","));
  }
  function isCollectionContext(a){
    return !!a.closest([
      ".collection--card-item",
      ".collection-list--wrapper",
      ".collections-tab--menu-content-item-box",
      ".collections-tab--menu-content-item-inner",
      ".main-collection-list--outer",
      ".main-collection--sidebar",
      ".main-collection--header"
    ].join(","));
  }
  function inferLegacyStoreHref(rawHref, a){
    var parts=parseHrefParts(rawHref);
    var path=parts.path.replace(/^\\.?\\//,"").replace(/^\\.\\.\\//g,"");
    var search=parts.search||"";
    var hash=parts.hash||"";
    if(!path)return null;
    if(/^all\\d*\\.html$/i.test(path))return "/collections/all"+search+hash;
    var product=path.match(/(?:^|\\/)(?:[a-z]{2}(?:-[a-z]{2})?\\/)?products\\/([^/?#]+)\\.html$/i);
    if(product)return "/products/"+product[1]+search+hash;
    var collection=path.match(/(?:^|\\/)(?:[a-z]{2}(?:-[a-z]{2})?\\/)?collections\\/([^/?#]+)\\.html$/i);
    if(collection)return "/collections/"+collection[1]+search+hash;
    var page=path.match(/(?:^|\\/)(?:[a-z]{2}(?:-[a-z]{2})?\\/)?pages\\/([^/?#]+)\\.html$/i);
    if(page)return "/pages/"+page[1]+search+hash;
    var blog=path.match(/(?:^|\\/)(?:[a-z]{2}(?:-[a-z]{2})?\\/)?blogs\\/([^/?#]+)\\.html$/i);
    if(blog)return "/blogs/"+blog[1]+".html"+search+hash;
    if(/(?:^|\\/)index\\.html$/i.test(path))return "/"+search+hash;
    var bare=path.match(/^([^/?#]+)\\.html$/i);
    if(bare){
      if(isProductContext(a))return "/products/"+bare[1]+search+hash;
      if(isCollectionContext(a))return "/collections/"+bare[1]+search+hash;
    }
    return null;
  }
  function shouldSkip(a, rawHref){
    if(!rawHref)return true;
    var drawer=a.closest('account-drawer');
    if(drawer){
      if(a.closest('.kn-account-logged-in'))return false;
      if(a.closest('account-event[data-target]'))return true;
      if(/^\\/account\\/(?:register|login|forgot-password)/i.test(rawHref))return true;
      if(/index\\.html$/i.test(rawHref)&&a.closest('account-event'))return true;
    }
    if(a.hasAttribute("download"))return true;
    var target=(a.getAttribute("target")||"").trim().toLowerCase();
    if(target&&target!=="_self")return true;
    if(rawHref[0]==="#")return true;
    if(/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(rawHref))return true;
    return false;
  }
  function isAssetPath(pathname){
    return /^\\/(?:api|_next|theme|uploads)\\//i.test(pathname) ||
      /\\.(?:avif|css|gif|ico|jpe?g|js|json|m4a|mov|mp3|mp4|pdf|png|svg|txt|wav|webm|webp|woff2?)$/i.test(pathname);
  }
  function isPlaceholderHref(href){
    return !href || /(?:^|\\/)(?:blank|null|undefined)(?:$|[?#\\/])/i.test(href) || href==="about:blank";
  }
  function rewriteExternalStoreHref(url){
    var host=String(url.hostname||"").toLowerCase();
    if(/shopify\\.com$/i.test(host)&&/account/i.test(url.pathname+url.search))return "/account";
    if(/myshopify\\.com$/i.test(host)){
      var product=url.pathname.match(/\\/products\\/([^/]+)/i);
      if(product)return "/products/"+decodeURIComponent(product[1])+url.search+url.hash;
      var collection=url.pathname.match(/\\/collections\\/([^/]+)/i);
      if(collection)return "/collections/"+decodeURIComponent(collection[1])+url.search+url.hash;
    }
    if(/customer_authentication\\/redirect/i.test(url.pathname))return "/account";
    return null;
  }
  function resolveTopHref(a){
    var rawHref=String(a.getAttribute("href")||"").trim();
    if(shouldSkip(a,rawHref))return null;
    if(rawHref[0]==="/"){
      return isAssetPath(rawHref)||isPlaceholderHref(rawHref) ? null : rawHref;
    }
    var legacy=inferLegacyStoreHref(rawHref,a);
    if(legacy)return isPlaceholderHref(legacy)?null:legacy;
    try{
      var url=new URL(rawHref,window.location.href);
      var external=rewriteExternalStoreHref(url);
      if(external)return isPlaceholderHref(external)?null:external;
      if(url.origin!==window.location.origin)return null;
      if(isAssetPath(url.pathname))return null;
      if(/\\.html?$/i.test(url.pathname)){
        var fromPath=inferLegacyStoreHref(url.pathname+url.search+url.hash,a);
        if(fromPath)return isPlaceholderHref(fromPath)?null:fromPath;
      }
      var resolved=url.pathname+url.search+url.hash;
      return isPlaceholderHref(resolved)?null:resolved;
    }catch(_err){
      return null;
    }
  }
  function navigateTop(href){
    try{
      (window.top||window).location.href=href;
    }catch(_err){
      window.location.href=href;
    }
  }
  document.addEventListener("click",function(e){
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var t=e.target;
    if(!t||!t.closest)return;
    var a=t.closest("a[href]");
    if(!a)return;
    var href=resolveTopHref(a);
    if(!href)return;
    e.preventDefault();
    e.stopPropagation();
    navigateTop(href);
  },true);
})();</script>`;

export function injectMirrorLinkBridge(html: string): string {
  if (html.includes('id="kn-link-bridge"')) return html;
  const out = html.replace(/<script id="kn-link-bridge">[\s\S]*?<\/script>/i, "");
  return out.replace(/<\/body>/i, `${LINK_BRIDGE_SCRIPT}</body>`);
}
