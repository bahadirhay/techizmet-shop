/** Product gallery zoom — iframe + theme shell */

export const PRODUCT_MEDIA_ZOOM_FIX_CSS = `
html.kn-mirror-embed product-media-popup.popup,
html.kn-mirror-embed .popup.product-media-popup {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 20000 !important;
  margin: 0 !important;
}
html.kn-mirror-embed product-media-popup.popup .popup-dialog.fullwidth,
html.kn-mirror-embed .popup.product-media-popup .popup-dialog.fullwidth {
  max-width: 100% !important;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}
html.kn-mirror-embed product-media-popup .popup-close,
html.kn-mirror-embed .product-media-popup .popup-close {
  pointer-events: all !important;
  z-index: 5 !important;
  position: relative !important;
}
html.kn-mirror-embed.kn-product-zoom-open #kn-street-food-bar {
  display: none !important;
}
html.kn-mirror-embed.kn-product-zoom-open,
html.kn-mirror-embed.kn-product-zoom-open body {
  overflow: visible !important;
}
/* Zoom butonunu yalnızca gerçek dokunmatik cihazlarda kapat (mobil JS touch handler üstlenir) */
@media (hover: none) and (pointer: coarse) {
  #MainContent .main--product-image-slider-outer media-zoom-button {
    pointer-events: none !important;
  }
}
#MainContent .main--product-image-slider-outer .main--product-img .media > img,
#MainContent .main--product-image-slider-outer .main--product-img .media > video {
  pointer-events: none !important;
}
/* Masaüstü: tüm görsel alanı tıklanabilir görünsün */
@media (hover: hover) and (pointer: fine) {
  #MainContent .main--product-image-slider-outer .swiper-slide .media {
    cursor: zoom-in !important;
  }
}
/* Popup zoom swiper: resim boyutunu viewport ile sınırla */
html.kn-mirror-embed product-media-popup .swiper-zoom-container img,
html.kn-mirror-embed .product-media-popup .swiper-zoom-container img {
  max-height: 90vh !important;
  max-width: 95vw !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
}
/* Masaüstü: Trendyol gibi büyük, ortalanmış görsel */
@media (min-width: 768px) {
  html.kn-mirror-embed product-media-popup .swiper-zoom-container img,
  html.kn-mirror-embed .product-media-popup .swiper-zoom-container img {
    max-height: 88vh !important;
    max-width: 80vw !important;
  }
  html.kn-mirror-embed product-media-popup .popup-dialog.fullwidth,
  html.kn-mirror-embed .product-media-popup .popup-dialog.fullwidth {
    flex-direction: row !important;
  }
}
html.kn-mirror-embed product-media-popup .swiper,
html.kn-mirror-embed .product-media-popup .swiper {
  height: 100% !important;
}
html.kn-mirror-embed product-media-popup .swiper-slide,
html.kn-mirror-embed .product-media-popup .swiper-slide {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}`;

export const PRODUCT_MEDIA_ZOOM_FIX_SCRIPT = `(function(){
  // Tema JS kaldırıldı — [data-swiper] elementlerini kendimiz init ediyoruz
  (function initAllSwipers(){
    if(typeof Swiper==="undefined")return;
    document.querySelectorAll("[data-swiper]:not(.swiper-initialized)").forEach(function(el){
      try{var cfg=JSON.parse(el.getAttribute("data-swiper")||"{}");new Swiper(el,cfg);}catch(e){}
    });
  })();
  var KN_ZOOM_VER=9;
  if(window.__knProductZoomVer===KN_ZOOM_VER)return;
  window.__knProductZoomVer=KN_ZOOM_VER;
  // Generation counter: eski sürüm listener'ları bu sayaç değişince kendini iptal eder
  window.__knZoomGen=(window.__knZoomGen||0)+1;
  var _gen=window.__knZoomGen;
  var TAP_MOVE_PX=14;
  var TAP_MAX_MS=420;
  var pending=null;
  function isMobile(){
    // Gerçek dokunmatik cihaz tespiti — dar masaüstü penceresini yanlış etiketlemez
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }
  function mainGallerySwiper(){
    var outer=document.querySelector("#MainContent .main--product-image-slider-outer");
    return outer&&outer.swiper?outer.swiper:null;
  }
  function resolveGalleryIndex(btn){
    // Önce: tıklanan butondaki data-index — masaüstü slidesPerView>1 durumunda en güvenilir
    var fromAttr=parseInt(btn&&btn.dataset&&btn.dataset.index,10);
    if(!isNaN(fromAttr))return fromAttr;
    // Butonu içeren slide'ın DOM sırası
    var slide=btn&&btn.closest?btn.closest(".swiper-slide"):null;
    if(slide&&!slide.classList.contains("swiper-slide-duplicate")){
      var outer=document.querySelector("#MainContent .main--product-image-slider-outer");
      var slides=outer?Array.prototype.slice.call(outer.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)")):[];
      var idx=slides.indexOf(slide);
      if(idx>=0)return idx;
    }
    // Fallback: swiper aktif index (tek resimli mobil için)
    var sw=mainGallerySwiper();
    if(sw&&typeof sw.realIndex==="number"&&!isNaN(sw.realIndex))return sw.realIndex;
    if(sw&&typeof sw.activeIndex==="number"&&!isNaN(sw.activeIndex))return sw.activeIndex;
    return 0;
  }
  function selectPopupSlide(popup,index){
    var host=popup.querySelector("swiper-content");
    var tries=0;
    function run(){
      var sw=(host&&host.swiper)||(function(){var el=popup.querySelector(".swiper");return el&&el.swiper;})();
      if(!sw)return false;
      if(sw.params&&sw.params.loop&&typeof sw.slideToLoop==="function")sw.slideToLoop(index,0);
      else if(typeof sw.slideTo==="function")sw.slideTo(index,0);
      return true;
    }
    if(run())return;
    var timer=setInterval(function(){
      if(run()||++tries>40)clearInterval(timer);
    },50);
  }
  function openProductZoom(btn){
    if(!btn)return false;
    var index=resolveGalleryIndex(btn);
    // Galeri slide'larından görsel URL'lerini topla
    var outer=document.querySelector("#MainContent .main--product-image-slider-outer");
    if(!outer)return false;
    var slides=Array.prototype.slice.call(outer.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)"));
    if(!slides.length)return false;
    var images=[];
    slides.forEach(function(s){
      var img=s.querySelector("img[data-original],img");
      if(img)images.push(img.getAttribute("data-original")||img.getAttribute("src")||"");
    });
    images=images.filter(Boolean);
    if(!images.length)return false;
    var current=Math.min(index,images.length-1);
    // Mevcut overlay varsa kaldır
    var existing=document.getElementById("kn-zoom-overlay");
    if(existing)existing.parentNode&&existing.parentNode.removeChild(existing);
    // Overlay
    var overlay=document.createElement("div");
    overlay.id="kn-zoom-overlay";
    overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:#111;z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.18s;";
    // Görsel
    var imgEl=document.createElement("img");
    imgEl.src=images[current];
    imgEl.style.cssText="max-width:94vw;max-height:94vh;object-fit:contain;display:block;border-radius:4px;";
    overlay.appendChild(imgEl);
    // Kapatma butonu
    var closeBtn=document.createElement("button");
    closeBtn.setAttribute("aria-label","Kapat");
    closeBtn.style.cssText="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.18);border:none;color:#fff;width:44px;height:44px;border-radius:50%;font-size:26px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;";
    closeBtn.innerHTML="&times;";
    overlay.appendChild(closeBtn);
    function closeOverlay(){
      overlay.style.opacity="0";
      setTimeout(function(){
        if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
        try{window.parent.postMessage({type:"kn-zoom-close"},"*");}catch(ex){}
      },180);
    }
    closeBtn.addEventListener("click",closeOverlay);
    overlay.addEventListener("click",function(e){if(e.target===overlay)closeOverlay();});
    var _escHandler=function(e){if(e.key==="Escape"){closeOverlay();document.removeEventListener("keydown",_escHandler);}};
    document.addEventListener("keydown",_escHandler);
    // Navigasyon (birden fazla görsel)
    if(images.length>1){
      function makeNavBtn(html,side){
        var b=document.createElement("button");
        b.style.cssText="position:absolute;"+side+":14px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.18);border:none;color:#fff;width:48px;height:48px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;";
        b.innerHTML=html;
        return b;
      }
      var prevBtn=makeNavBtn("&#8592;","left");
      var nextBtn=makeNavBtn("&#8594;","right");
      prevBtn.addEventListener("click",function(e){e.stopPropagation();current=(current-1+images.length)%images.length;imgEl.src=images[current];});
      nextBtn.addEventListener("click",function(e){e.stopPropagation();current=(current+1)%images.length;imgEl.src=images[current];});
      overlay.appendChild(prevBtn);
      overlay.appendChild(nextBtn);
    }
    document.body.appendChild(overlay);
    // Fade-in ve iframe genişletme
    setTimeout(function(){overlay.style.opacity="1";},16);
    try{window.parent.postMessage({type:"kn-zoom-open"},"*");}catch(ex){}
    return true;
  }
  function activeGalleryMedia(target){
    return target&&target.closest&&target.closest("#MainContent .main--product-image-slider-outer .swiper-slide-active .media");
  }
  document.addEventListener("touchstart",function(e){
    if(window.__knZoomGen!==_gen)return;
    if(!isMobile())return;
    var media=activeGalleryMedia(e.target);
    if(!media){pending=null;return;}
    var t=e.changedTouches&&e.changedTouches[0];
    if(!t)return;
    pending={x:t.clientX,y:t.clientY,t:Date.now(),moved:false,media:media};
  },{passive:true,capture:true});
  document.addEventListener("touchmove",function(e){
    if(window.__knZoomGen!==_gen||!pending)return;
    var t=e.changedTouches&&e.changedTouches[0];
    if(!t)return;
    if(Math.abs(t.clientX-pending.x)>TAP_MOVE_PX||Math.abs(t.clientY-pending.y)>TAP_MOVE_PX)pending.moved=true;
  },{passive:true,capture:true});
  document.addEventListener("touchend",function(e){
    if(window.__knZoomGen!==_gen||!isMobile()||!pending)return;
    var snap=pending;
    pending=null;
    if(snap.moved||Date.now()-snap.t>TAP_MAX_MS)return;
    var media=activeGalleryMedia(e.target);
    if(!media||media!==snap.media)return;
    var btn=media.querySelector("media-zoom-button");
    if(!btn)return;
    e.preventDefault();
    openProductZoom(btn);
  },true);
  document.addEventListener("touchcancel",function(){if(window.__knZoomGen===_gen)pending=null;},true);
  document.addEventListener("click",function(e){
    if(window.__knZoomGen!==_gen||isMobile())return;
    // Görselin herhangi bir yerine tıklamak zoom'u açsın
    var media=e.target&&e.target.closest&&e.target.closest("#MainContent .main--product-image-slider-outer .swiper-slide .media");
    if(!media)return;
    var btn=media.querySelector("media-zoom-button");
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openProductZoom(btn);
  },true);
  var _zoomWasOpen=false;
  function sync(){
    var open=!!document.querySelector("product-media-popup.show,.product-media-popup.show");
    document.documentElement.classList.toggle("kn-product-zoom-open",open);
    var bar=document.getElementById("kn-street-food-bar");
    if(bar)bar.toggleAttribute("hidden",open);
    if(open!==_zoomWasOpen){
      _zoomWasOpen=open;
      try{window.parent.postMessage({type:open?"kn-zoom-open":"kn-zoom-close"},"*");}catch(e){}
    }
  }
  try{
    new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
  }catch(e){}
  document.addEventListener("click",function(){setTimeout(sync,0);setTimeout(sync,450);});
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape")return;
    var p=document.querySelector("product-media-popup.show,.product-media-popup.show");
    if(!p)return;
    var close=p.querySelector("[data-popup-close]");
    if(close)close.click();
  });
})();`;

export function adaptMirrorInlineScriptForThemeShell(code: string): string {
  return code
    .replace(
      /try\{window\.parent\.postMessage\(\{type:"kn-zoom-close"\},"\*"\);\}catch\([^)]*\)\{\}/g,
      'document.documentElement.classList.remove("kn-product-zoom-open");',
    )
    .replace(
      /try\{window\.parent\.postMessage\(\{type:"kn-zoom-open"\},"\*"\);\}catch\([^)]*\)\{\}/g,
      'document.documentElement.classList.add("kn-product-zoom-open");',
    )
    .replace(
      /try\{window\.parent\.postMessage\(\{type:open\?"kn-zoom-open":"kn-zoom-close"\},"\*"\);\}catch\([^)]*\)\{\}/g,
      'document.documentElement.classList.toggle("kn-product-zoom-open",open);',
    );
}

export function getThemeShellProductMediaZoomScript(): string {
  return adaptMirrorInlineScriptForThemeShell(PRODUCT_MEDIA_ZOOM_FIX_SCRIPT);
}
