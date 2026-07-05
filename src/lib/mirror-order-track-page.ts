/** Techizmet Shop — sipariş takip mirror (iframe → /orders/track/embed) */

export const ORDER_TRACK_MIRROR_CSS = `<style id="kn-order-track-mirror-css">
.kn-order-track-embed-wrap {
  width: 100%;
  max-width: 100%;
}
.kn-order-track-embed {
  display: block;
  width: 100%;
  min-height: min(520px, 75vh);
  border: 0;
  background: transparent;
  overflow: hidden;
}
</style>`;

export const ORDER_TRACK_EMBED_BRIDGE_SCRIPT = `<script id="kn-order-track-embed-bridge">(function(){
  var iframe=document.getElementById("kn-order-track-embed");
  if(!iframe)return;
  function fit(){
    var top=iframe.getBoundingClientRect().top;
    var h=Math.max(420, window.innerHeight-top-12);
    iframe.style.height=Math.ceil(h)+"px";
  }
  fit();
  window.addEventListener("resize",fit);
  iframe.addEventListener("load",fit);
})();</script>`;

function embedSrcWithOrder(order?: string): string {
  const base = "/orders/track/embed";
  if (!order?.trim()) return base;
  return `${base}?order=${encodeURIComponent(order.trim())}`;
}

export const ORDER_TRACK_EMBED_BRIDGE_JS = ORDER_TRACK_EMBED_BRIDGE_SCRIPT.replace(
  /^<script id="kn-order-track-embed-bridge">/,
  "",
).replace(/<\/script>\s*$/i, "");

export function applyOrderTrackPageToMirrorHtml(html: string, orderNumber?: string): string {
  let out = html;
  out = out.replace(/kn-order-track-embed\.css\?v=\d+/g, "kn-order-track-embed.css?v=1");
  if (!out.includes('id="kn-order-track-mirror-css"')) {
    out = out.replace(/<\/head>/i, `${ORDER_TRACK_MIRROR_CSS}</head>`);
  }
  if (!out.includes('id="kn-order-track-embed-bridge"')) {
    out = out.replace(/<\/body>/i, `${ORDER_TRACK_EMBED_BRIDGE_SCRIPT}</body>`);
  }
  if (!out.includes("kn-order-track-embed.css")) {
    out = out.replace(
      /<\/head>/i,
      '<link href="/theme/techizmet-shop/kn-order-track-embed.css?v=1" rel="stylesheet" type="text/css" media="all" />\n</head>',
    );
  }
  const src = embedSrcWithOrder(orderNumber);
  out = out.replace(
    /(<iframe[^>]*id="kn-order-track-embed"[^>]*\ssrc=")[^"]*(")/i,
    `$1${src}$2`,
  );
  return out;
}
