/** Techizmet Shop — checkout mirror (iframe → /checkout/embed) */

export const CHECKOUT_MIRROR_CSS = `<style id="kn-checkout-mirror-css">
.kn-checkout-embed-wrap {
  width: 100%;
  max-width: 100%;
}
.kn-checkout-embed {
  display: block;
  width: 100%;
  min-height: 720px;
  border: 0;
  background: transparent;
  overflow: hidden;
}
</style>`;

export const CHECKOUT_EMBED_BRIDGE_SCRIPT = `<script id="kn-checkout-embed-bridge">(function(){
  var iframe=document.getElementById("kn-checkout-embed");
  if(!iframe)return;
  window.addEventListener("message",function(e){
    if(!e.data||e.data.type!=="kn-checkout-resize")return;
    var h=Number(e.data.height);
    if(!h||h<200)return;
    iframe.style.height=Math.ceil(h+16)+"px";
  });
  iframe.addEventListener("load",function(){
    try{
      var h=iframe.contentWindow.document.documentElement.scrollHeight;
      if(h>200)iframe.style.height=Math.ceil(h+16)+"px";
    }catch(err){}
  });
})();</script>`;

export function applyCheckoutPageToMirrorHtml(html: string): string {
  let out = html;
  if (!out.includes('id="kn-checkout-mirror-css"')) {
    out = out.replace(/<\/head>/i, `${CHECKOUT_MIRROR_CSS}</head>`);
  }
  if (!out.includes('id="kn-checkout-embed-bridge"')) {
    out = out.replace(/<\/body>/i, `${CHECKOUT_EMBED_BRIDGE_SCRIPT}</body>`);
  }
  if (!out.includes("kn-checkout-embed.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/kn-checkout-embed.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  return out;
}
