/** Vitrin + canlı site — mega menü görsellerini önceden yükle */

export const MIRROR_NAV_MEGA_PRELOAD_SCRIPT = `function knExtractBgUrl(styleValue){
  var m=String(styleValue||"").match(/url\\((['"]?)(.*?)\\1\\)/i);
  var raw=m&&m[2]?String(m[2]).trim():"";
  return raw||null;
}
function knPreloadMegaInRoot(root,priority){
  if(!root)return;
  if(!window.__knMegaImagePreloaded)window.__knMegaImagePreloaded=new Set();
  var seen=window.__knMegaImagePreloaded;
  var sel=".kn-nav-mega__tile-img[style], .kn-nav-mega__product-img[style]";
  root.querySelectorAll(sel).forEach(function(el){
    var src=knExtractBgUrl(el.getAttribute("style")||"");
    if(!src||seen.has(src))return;
    seen.add(src);
    var img=new Image();
    img.decoding="async";
    img.loading="eager";
    if(priority==="high"){
      try{img.fetchPriority="high";}catch(_e){}
    }
    img.src=src;
  });
}
function knPreloadMegaForLi(li){
  if(!li){knPreloadMegaInRoot(document,"high");return;}
  var id=li.dataset.knNavMegaId;
  if(!id){knPreloadMegaInRoot(document,"high");return;}
  var mega=document.querySelector('#kn-mega-host .kn-nav-dropdown--fruitser[data-kn-nav-mega-id="'+id+'"]');
  if(mega)knPreloadMegaInRoot(mega,"high");
  else knPreloadMegaInRoot(document,"high");
}
function knWarmMegaImages(){
  knPreloadMegaInRoot(document,"low");
}
function knScheduleMegaWarm(){
  if(window.__knMegaWarmScheduled)return;
  window.__knMegaWarmScheduled=1;
  var run=function(){knWarmMegaImages();};
  if(typeof requestIdleCallback==="function")requestIdleCallback(run,{timeout:400});
  else setTimeout(run,80);
}`;
