/** Mirror vitrin — boş sayfa / görünmeyen bölümler (hafif, reflow yok) */

const VISIBLE_STYLE = `<style id="kn-mirror-visible-fallback">
#MainContent .shopify-section,
#MainContent [data-saos],
#MainContent .revealing-text--content,
#MainContent .revealing-text--line {
  opacity: 1 !important;
  visibility: visible !important;
}
</style>`;

const BOOT_SCRIPT = `<script id="kn-mirror-content-boot">(function(){
  var done=false;
  function reveal(){
    if(done)return;
    done=true;
    try{
      document.querySelectorAll("[data-saos],.revealing-text--content,.revealing-text--line").forEach(function(el){
        el.style.opacity="1";
        el.style.visibility="visible";
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

/** Animasyonlar tamamlanmazsa içerik yine görünsün */
export function injectMirrorContentFallback(html: string): string {
  let out = html;
  if (!out.includes('id="kn-mirror-visible-fallback"')) {
    out = out.replace(/<head>/i, `<head>${VISIBLE_STYLE}`);
  }
  if (!out.includes('id="kn-mirror-content-boot"')) {
    out = out.replace(/<\/body>/i, `${BOOT_SCRIPT}</body>`);
  }
  return out;
}
