/** Techizmet Shop — checkout mirror (iframe → /checkout/embed) */

export const CHECKOUT_MIRROR_CSS = `<style id="kn-checkout-mirror-css">
.kn-checkout-embed-wrap {
  width: 100%;
  max-width: 100%;
}
.kn-checkout-embed {
  display: block;
  width: 100%;
  min-height: min(720px, 85vh);
  border: 0;
  background: transparent;
  overflow: hidden;
}
</style>`;

/** Iframe yüksekliği = görünür alan; içeride kaydırma + sticky özet çalışır */
export const CHECKOUT_EMBED_BRIDGE_SCRIPT = `<script id="kn-checkout-embed-bridge">(function(){
  var iframe=document.getElementById("kn-checkout-embed");
  if(!iframe)return;
  function fit(){
    var top=iframe.getBoundingClientRect().top;
    var h=Math.max(520, window.innerHeight-top-12);
    iframe.style.height=Math.ceil(h)+"px";
  }
  fit();
  window.addEventListener("resize",fit);
  iframe.addEventListener("load",fit);
})();</script>`;

export const CHECKOUT_EMBED_BRIDGE_JS = CHECKOUT_EMBED_BRIDGE_SCRIPT.replace(
  /^<script id="kn-checkout-embed-bridge">/,
  "",
).replace(/<\/script>\s*$/i, "");

export function applyCheckoutPageToMirrorHtml(html: string): string {
  let out = html;
  out = out.replace(/kn-checkout-embed\.css\?v=\d+/g, "kn-checkout-embed.css?v=4");
  if (!out.includes('id="kn-checkout-mirror-css"')) {
    out = out.replace(/<\/head>/i, `${CHECKOUT_MIRROR_CSS}</head>`);
  } else {
    out = out.replace(/<style id="kn-checkout-mirror-css">[\s\S]*?<\/style>/i, CHECKOUT_MIRROR_CSS);
  }
  if (!out.includes('id="kn-checkout-embed-bridge"')) {
    out = out.replace(/<\/body>/i, `${CHECKOUT_EMBED_BRIDGE_SCRIPT}</body>`);
  } else {
    out = out.replace(
      /<script id="kn-checkout-embed-bridge">[\s\S]*?<\/script>/i,
      CHECKOUT_EMBED_BRIDGE_SCRIPT,
    );
  }
  if (!out.includes("kn-checkout-embed.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link rel="preload" href="/checkout/embed" as="document" />\n<link href="/theme/techizmet-shop/kn-checkout-embed.css?v=4" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  return out;
}
