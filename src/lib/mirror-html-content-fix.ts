import {
  MIRROR_EMBED_HERO_CRITICAL_CSS,
  MIRROR_IMAGE_REVEAL_CSS,
  patchMirrorNoJsHiddenImagesHtml,
} from "@/lib/mirror-image-reveal";
import { MIRROR_EMBED_BOOT_SCRIPT_ID, MIRROR_EMBED_BOOT_SCRIPT_SRC } from "@/lib/mirror-embed-boot";

/** Mirror vitrin — boş sayfa / görünmeyen bölümler (hafif, reflow yok) */

const VISIBLE_STYLE = `<style id="kn-mirror-visible-fallback">
#MainContent .kn-mirror-section,
#MainContent [data-saos],
#MainContent .revealing-text--content,
#MainContent .revealing-text--line {
  opacity: 1 !important;
  visibility: visible !important;
}
${MIRROR_IMAGE_REVEAL_CSS}
${MIRROR_EMBED_HERO_CRITICAL_CSS}
</style>`;

const BOOT_SCRIPT = `<script id="kn-mirror-content-boot">(function(){
  try{document.documentElement.classList.add("kn-mirror-embed");}catch(e){}
  var done=false;
  function reveal(){
    if(done)return;
    done=true;
    try{
      document.documentElement.classList.add("kn-mirror-embed");
      document.querySelectorAll("[data-saos],.revealing-text--content,.revealing-text--line").forEach(function(el){
        el.style.opacity="1";
        el.style.visibility="visible";
      });
      document.querySelectorAll("img.no-js-hidden,img.lazyload,img[lazyload],img.media_image").forEach(function(node){
        if(!node||node.tagName!=="IMG")return;
        var url=(node.getAttribute("data-original")||node.getAttribute("data-src")||node.src||"").trim();
        if(url&&url.indexOf("{width}")<0){node.src=url;node.setAttribute("data-src",url);node.setAttribute("data-original",url);}
        node.classList.remove("no-js-hidden","lazyload","lazyloading");
        node.classList.add("lazyloaded");
        node.removeAttribute("loading");
      });
    }catch(e){}
  }
  function schedule(){
    if(typeof requestAnimationFrame==="function"){requestAnimationFrame(reveal);}
    else{setTimeout(reveal,0);}
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",schedule,{once:true});}
  else{schedule();}
  window.addEventListener("load",schedule,{once:true});
})();</script>`;

const EMBED_BOOT = `<script id="${MIRROR_EMBED_BOOT_SCRIPT_ID}" src="${MIRROR_EMBED_BOOT_SCRIPT_SRC}" async></script>`;

/** Animasyonlar tamamlanmazsa içerik yine görünsün */
export function injectMirrorContentFallback(html: string): string {
  let out = patchMirrorNoJsHiddenImagesHtml(html);
  if (!out.includes('id="kn-mirror-visible-fallback"')) {
    out = out.replace(/<head>/i, `<head>${VISIBLE_STYLE}`);
  }
  if (!out.includes('id="kn-mirror-content-boot"')) {
    out = out.replace(/<\/body>/i, `${BOOT_SCRIPT}</body>`);
  }
  if (!out.includes('id="kn-mirror-embed-boot"')) {
    out = out.replace(/<\/body>/i, `${EMBED_BOOT}</body>`);
  }
  return out;
}
