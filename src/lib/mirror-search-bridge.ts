/** Mirror iframe — arama çekmecesi → local DB (/api/store/search-drawer, /search) */

import { PRODUCT_IMAGE_MEDIA_RATIO_PERCENT, productImagePlaceholderStyle } from "@/lib/product-image-spec";

const PRODUCT_IMG_PLACEHOLDER = productImagePlaceholderStyle();

const SEARCH_BRIDGE_SCRIPT = `<script id="kn-search-bridge">(function(){
  var TR=document.documentElement.lang&&document.documentElement.lang.indexOf("tr")===0;
  var L={
    search:TR?"Arama":"Search",
    suggestions:TR?"Öneriler":"Suggestions",
    popular:TR?"Popüler koleksiyonlar":"Popular collections",
    details:TR?"Detayları gör":"View details",
    from:TR?"Başlayan fiyat":"From",
    noResults:TR?"Sonuç bulunamadı":"No results found",
    placeholder:TR?"Ürün ara…":"Search products…"
  };
  function drawer(){
    return document.querySelector('[data-drawer="search-drawer"]')||document;
  }
  function esc(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
  }
  function bust(url){
    if(!url)return "";
    return url.indexOf("?")>=0?url+"&kn=1":url+"?kn=1";
  }
  function productCard(p){
    var href="/products/"+encodeURIComponent(p.slug);
    var img=p.imageUrl
      ?'<img class="lazyload no-js-hidden product-image" src="'+esc(bust(p.imageUrl))+'" data-original="'+esc(p.imageUrl)+'" alt="'+esc(p.title)+'" loading="lazy">'
      :'<div class="product-image" style="${PRODUCT_IMG_PLACEHOLDER}"></div>';
    return '<div class="horizontal--product-card">'+
      '<a href="'+href+'" class="horizontal--product-image media-wrapper"><div class="media" style="--image_ratio:${PRODUCT_IMAGE_MEDIA_RATIO_PERCENT}%;">'+img+'</div></a>'+
      '<div class="horizontal--product-detail">'+
        '<a href="'+href+'" class="product--title">'+esc(p.title)+'</a>'+
        '<div class="product--pricing text"><span class="product--actual-price heading-font">'+esc(L.from)+' '+esc(p.priceLabel)+'</span>'+
        (p.compareLabel?'<span class="product--cut-price line-through">'+esc(p.compareLabel)+'</span>':'')+
        '</div>'+
        '<div class="product--view-detail text-right"><a href="'+href+'" class="text-underline text-small"> '+esc(L.details)+'</a></div>'+
      '</div></div>';
  }
  function collectionCard(c){
    var href="/collections/"+encodeURIComponent(c.slug);
    var img=c.imageUrl
      ?'<img class="lazyload no-js-hidden collection-product-image" src="'+esc(bust(c.imageUrl))+'" data-original="'+esc(c.imageUrl)+'" alt="'+esc(c.title)+'" loading="lazy">'
      :'<div class="collection-product-image" style="aspect-ratio:1;background:var(--body_alternate_background)"></div>';
    return '<a href="'+href+'" class="d-block card--item animate-hover">'+
      '<div class="card--image media-wrapper"><div class="media" style="--image_ratio:100%;">'+img+'</div></div>'+
      '<h6 class="card--title heading-font text-medium text-center">'+esc(c.title)+'</h6></a>';
  }
  function localizeDrawer(){
    var root=drawer();
    var heading=root.querySelector(".serach--drawer-heading, .search--drawer-heading");
    if(heading)heading.textContent=L.search;
    root.querySelectorAll('a[title="Search"], a[aria-label="Search"], a[title="Arama"], a[aria-label="Arama"]').forEach(function(a){
      a.setAttribute("title",L.search);
      a.setAttribute("aria-label",L.search);
    });
    var input=root.querySelector("[data-search-input], #Search-In-Template, .search--drawer-input");
    if(input){
      input.setAttribute("placeholder",L.placeholder);
      input.setAttribute("aria-label",L.placeholder);
    }
    var sugg=root.querySelector(".predictive-search--products .predictive--search-heading");
    if(sugg)sugg.textContent=L.suggestions;
    var pop=root.querySelector(".predictive--search-collections .predictive--search-heading");
    if(pop)pop.textContent=L.popular;
  }
  function render(payload,q){
    var root=drawer();
    var terms=root.querySelector("[data-search-terms]");
    var results=root.querySelector("[data-search-results]");
    var list=root.querySelector(".predictive-search--products-list");
    var cols=root.querySelector(".predictive--search-collections-list");
    var hasQuery=String(q||"").trim().length>=2;
    if(hasQuery){
      if(terms)terms.style.display="none";
      if(results){
        var productsHtml=payload.products.length
          ?payload.products.map(productCard).join("")
          :'<p class="text-small" style="padding:1rem 0">'+esc(L.noResults)+"</p>";
        var collectionsHtml=payload.collections.length
          ?'<div class="predictive--search-collections" style="padding-top:20px;border-top:1px dashed var(--border_color);margin-top:20px">'+
            '<p class="predictive--search-heading text-xlarge heading-font">'+esc(L.popular)+'</p>'+
            '<div class="predictive--search-collections-list">'+payload.collections.map(collectionCard).join("")+"</div></div>"
          :"";
        results.innerHTML=
          '<div class="predictive-search--products">'+
            '<p class="predictive--search-heading text-xlarge heading-font">'+esc(L.suggestions)+'</p>'+
            '<div class="predictive-search--products-list">'+productsHtml+"</div></div>"+
          collectionsHtml;
        results.style.display="";
      }
    }else{
      if(terms)terms.style.display="";
      if(results){
        results.innerHTML="";
        results.style.display="";
      }
      if(list)list.innerHTML=payload.products.map(productCard).join("");
      if(cols)cols.innerHTML=payload.collections.map(collectionCard).join("");
    }
  }
  var timer;
  var lastQuery="";
  function fetchResults(q){
    var term=String(q||"").trim();
    lastQuery=term;
    fetch("/api/store/search-drawer?q="+encodeURIComponent(term),{credentials:"same-origin"})
      .then(function(r){
        if(!r.ok)throw new Error("search");
        return r.json();
      })
      .then(function(data){
        if(String(lastQuery).trim()!==term)return;
        render(data||{products:[],collections:[]},term);
      })
      .catch(function(){
        var root=drawer();
        var results=root.querySelector("[data-search-results]");
        if(term.length>=2&&results){
          results.innerHTML='<p class="text-small" style="padding:1rem 0">'+esc(L.noResults)+"</p>";
          results.style.display="";
        }
      });
  }
  function analyticsAllowed(){
    try{
      var top=window.top||window;
      var choice=top.localStorage.getItem("cookie-consent-choice-v1");
      if(!choice||choice==="rejected")return false;
      if(choice==="accepted")return true;
      var raw=top.localStorage.getItem("cookie-consent-prefs-v1");
      if(!raw)return true;
      var prefs=JSON.parse(raw);
      return prefs.analytics!==false;
    }catch(_e){return false;}
  }
  function trackSearch(term,source){
    if(!analyticsAllowed())return;
    try{
      fetch("/api/events",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"same-origin",
        keepalive:true,
        body:JSON.stringify({events:[{type:"search_query",payload:{query:term,source:source||"drawer"}}]})
      }).catch(function(){});
    }catch(_e){}
  }
  function goSearch(q){
    var term=String(q||"").trim();
    if(term.length<2)return;
    trackSearch(term,"drawer");
    try{(window.top||window).location.href="/search?q="+encodeURIComponent(term);}
    catch(_e){window.location.href="/search?q="+encodeURIComponent(term);}
  }
  function patchPredictiveSearch(){
    drawer().querySelectorAll("predictive-search").forEach(function(el){
      if(el.__knSearchPatched)return;
      el.__knSearchPatched=true;
      el.getSearchResults=function(term){
        var input=el.querySelector("[data-search-input], .search--drawer-input");
        var q=String(term||"").trim();
        if(!q&&input)q=input.value.trim();
        fetchResults(q);
        return Promise.resolve();
      };
    });
  }
  function bindInput(input){
    if(!input||input.__knSearchBound)return;
    input.__knSearchBound=true;
    input.addEventListener("input",function(){
      var q=input.value.trim();
      clearTimeout(timer);
      timer=setTimeout(function(){fetchResults(q);},220);
    });
    input.addEventListener("keydown",function(e){
      if(e.key==="Enter"){
        e.preventDefault();
        goSearch(input.value);
      }
    });
    var form=input.closest("form");
    if(form&&!form.__knSearchBound){
      form.__knSearchBound=true;
      form.addEventListener("submit",function(e){
        e.preventDefault();
        goSearch(input.value);
      });
    }
    drawer().querySelectorAll(".search-form-button, .arrow--btn.search-form-button").forEach(function(btn){
      if(btn.__knSearchBound)return;
      btn.__knSearchBound=true;
      btn.addEventListener("click",function(e){
        e.preventDefault();
        goSearch(input.value);
      });
    });
  }
  function bind(){
    localizeDrawer();
    patchPredictiveSearch();
    var input=drawer().querySelector("[data-search-input], #Search-In-Template, .search--drawer-input");
    if(!input)return;
    bindInput(input);
    fetchResults("");
  }
  if(window.routes&&typeof window.routes==="object"){
    window.routes.predictive_search_url="/api/store/search/suggest";
    window.routes.cart_add_url="/api/cart/items";
    window.routes.cart_change_url="/api/cart/items";
    window.routes.cart_update_url="/api/cart";
    window.routes.cart_url="/cart";
  }
  function onReady(){
    bind();
    var searchDrawer=document.querySelector('[data-drawer="search-drawer"]');
    if(searchDrawer&&!searchDrawer.__knSearchObserver){
      searchDrawer.__knSearchObserver=true;
      new MutationObserver(function(){
        localizeDrawer();
        patchPredictiveSearch();
        var input=drawer().querySelector("[data-search-input], #Search-In-Template, .search--drawer-input");
        bindInput(input);
      }).observe(searchDrawer,{attributes:true,attributeFilter:["open","class"]});
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",onReady);
  else onReady();
})();</script>`;

export function injectMirrorSearchBridge(html: string): string {
  if (html.includes('id="kn-search-bridge"')) return html;
  const out = html.replace(/<script id="kn-search-bridge">[\s\S]*?<\/script>/i, "");
  return out.replace(/<\/body>/i, `${SEARCH_BRIDGE_SCRIPT}</body>`);
}

export const MIRROR_SEARCH_BRIDGE_JS = SEARCH_BRIDGE_SCRIPT.replace(
  /^<script id="kn-search-bridge">/,
  "",
).replace(/<\/script>\s*$/i, "");
