/** Mirror iframe — vitrin içi gezinmede analitik olayları üst pencereye bildirir */

export function injectMirrorAnalyticsBridge(html: string, storePath: string | null): string {
  if (!storePath || html.includes('id="kn-analytics-bridge"')) return html;

  const safePath = storePath.replace(/"/g, "");
  const meta = `<meta name="kn-store-path" content="${safePath}" />`;
  const script = `<script id="kn-analytics-bridge">(function(){
  var meta=document.querySelector('meta[name="kn-store-path"]');
  if(!meta)return;
  var path=meta.getAttribute("content")||"";
  if(!path)return;
  function ping(){
    try{window.parent.postMessage({type:"kn-mirror-analytics",path:path}, "*");}catch(e){}
    try{window.parent.postMessage({type:"kn-iframe-route",href:path}, "*");}catch(e){}
  }
  ping();
  window.addEventListener("load",ping);
})();</script>`;

  let out = html;
  if (!out.includes('name="kn-store-path"')) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}${meta}`);
  }
  return out.replace(/<\/body>/i, `${script}</body>`);
}
