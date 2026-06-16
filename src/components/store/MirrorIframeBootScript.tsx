import { MIRROR_EMBED_BOOT_SCRIPT_ID, MIRROR_EMBED_BOOT_SCRIPT_SRC } from "@/lib/mirror-embed-boot";

/** Üst sayfa — iframe yüklendiğinde boot script enjekte eder */

const PARENT_BOOT = `(function(){
  if(window.__knMirrorParentBoot)return;
  window.__knMirrorParentBoot=1;
  var BOOT_ID=${JSON.stringify(MIRROR_EMBED_BOOT_SCRIPT_ID)};
  var BOOT_SRC=${JSON.stringify(MIRROR_EMBED_BOOT_SCRIPT_SRC)};
  function inject(){
    var f=document.querySelector("iframe.mirror-home-frame");
    if(!f)return;
    var d;
    try{d=f.contentDocument;}catch(e){return;}
    if(!d||!d.getElementById("MainContent"))return;
    if(d.getElementById(BOOT_ID))return;
    var s=d.createElement("script");
    s.id=BOOT_ID;
    s.src=BOOT_SRC;
    s.async=true;
    d.body.appendChild(s);
  }
  function bind(){
    var f=document.querySelector("iframe.mirror-home-frame");
    if(f)f.addEventListener("load",inject);
    inject();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();`;

export function MirrorIframeBootScript() {
  return <script id="kn-mirror-parent-boot" dangerouslySetInnerHTML={{ __html: PARENT_BOOT }} />;
}
