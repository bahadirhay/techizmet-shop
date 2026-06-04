import type { ProductSharePayload } from "@/lib/product-share";

const SHARE_STYLES_CSS = `
html.kn-share-locked, html.kn-share-locked body { overflow: hidden; }
.kn-share-trigger{margin-left:.75rem;padding:.5rem 1rem;border:1px solid currentColor;border-radius:9999px;background:transparent;font-size:.875rem;cursor:pointer;opacity:.9;flex-shrink:0}
.kn-share-trigger:hover{opacity:1}
#kn-share-root{position:fixed;inset:0;z-index:10050;pointer-events:none;overflow:hidden}
#kn-share-root.kn-share-open{pointer-events:auto}
#kn-share-root .kn-share-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s;pointer-events:none}
#kn-share-root.kn-share-open .kn-share-backdrop{opacity:1;pointer-events:auto}
#kn-share-root .kn-share-dialog{position:absolute;left:50%;width:min(calc(100% - 1.5rem),24rem);max-height:min(78vh,calc(100vh - 10vh - env(safe-area-inset-bottom,0px)));overflow:auto;background:#fff;border-radius:1rem;padding:1rem 1rem 1.25rem;padding-top:calc(1rem + env(safe-area-inset-top,0px));box-shadow:0 8px 32px rgba(0,0,0,.18);transition:transform .25s ease,opacity .25s ease;pointer-events:auto;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
@media(max-width:767px){
  #kn-share-root .kn-share-dialog{bottom:auto;top:max(6vh,env(safe-area-inset-top,0px));transform:translate(-50%,-16px)}
  #kn-share-root.kn-share-open .kn-share-dialog{transform:translate(-50%,0)}
}
@media(min-width:768px){
  #kn-share-root .kn-share-dialog{bottom:auto;top:50%;left:50%;transform:translate(-50%,calc(-50% + 1.5rem));max-height:90vh;border-radius:1rem;opacity:0;box-shadow:0 -8px 32px rgba(0,0,0,.15)}
  #kn-share-root.kn-share-open .kn-share-dialog{transform:translate(-50%,-50%);opacity:1}
}
.kn-share-close{position:absolute;top:.65rem;right:.75rem;width:2rem;height:2rem;border:0;border-radius:50%;background:#f4f4f5;font-size:1.25rem;line-height:1;cursor:pointer;color:#52525b;display:flex;align-items:center;justify-content:center}
.kn-share-close:hover{background:#e4e4e7}
.kn-share-head{font-size:1.0625rem;font-weight:700;text-align:center;margin:0 0 .875rem;color:#18181b}
.kn-share-preview-card{border:1px solid #e4e4e7;border-radius:.75rem;overflow:hidden;margin-bottom:1rem;background:#fff}
.kn-share-preview-link{display:flex;gap:.625rem;padding:.625rem;align-items:stretch;text-decoration:none;color:inherit}
.kn-share-preview-thumb-wrap{width:4.5rem;flex-shrink:0;background:#f4f4f5;border-radius:.375rem;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:4.5rem}
.kn-share-preview-thumb{width:100%;height:100%;object-fit:cover;display:block}
.kn-share-preview-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.kn-share-preview-domain{font-size:.625rem;color:#71717a;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
.kn-share-preview-linktitle{font-size:.8125rem;font-weight:600;margin:.15rem 0 0;line-height:1.35;color:#18181b;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.kn-share-preview-price{font-size:.75rem;color:#52525b;margin-top:.2rem;font-weight:500}
.kn-share-section-label{font-size:.75rem;color:#71717a;margin:0 0 .625rem;font-weight:500}
.kn-share-platforms{display:grid;grid-template-columns:repeat(4,1fr);gap:.625rem}
.kn-share-platform{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.375rem .25rem;border:0;background:transparent;cursor:pointer;border-radius:.625rem;transition:background .15s}
.kn-share-platform:hover,.kn-share-platform:focus-visible{background:#f4f4f5;outline:none}
.kn-share-platform-icon{width:3rem;height:3rem;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.kn-share-platform-icon svg{width:1.375rem;height:1.375rem;fill:currentColor}
.kn-share-platform-icon--whatsapp{background:#25D366}
.kn-share-platform-icon--facebook{background:#1877F2}
.kn-share-platform-icon--instagram{background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)}
.kn-share-platform-icon--link{background:#52525b;color:#fff}
.kn-share-platform-name{font-size:.5625rem;color:#52525b;font-weight:600;text-transform:uppercase;letter-spacing:.02em}
#kn-share-toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(120%);background:#18181b;color:#fff;padding:.625rem 1rem;border-radius:.5rem;font-size:.8125rem;z-index:10060;transition:transform .2s;pointer-events:none;max-width:min(90vw,20rem);text-align:center;line-height:1.4}
.kn-share-toast--show{transform:translateX(-50%) translateY(0)}
`;

function buildShareScript(share: ProductSharePayload): string {
  const json = JSON.stringify(share);
  return `(function(){
  var SHARE=${json};
  var ICONS={
    whatsapp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    link:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>'
  };
  function qs(s,r){return (r||document).querySelector(s);}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function productUrl(){return location.origin+'/products/'+encodeURIComponent(SHARE.slug);}
  function shareText(){return [SHARE.title,SHARE.priceLabel,productUrl()].filter(Boolean).join('\\n');}
  function siteDomain(){try{return location.hostname.replace(/^www\\./,'').toUpperCase();}catch(e){return 'MAGAZA';}}
  function isMobile(){return window.matchMedia('(max-width:767px)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);}
  var root,toastTimer;
  function showToast(msg){
    var el=document.getElementById('kn-share-toast');
    if(!el){el=document.createElement('div');el.id='kn-share-toast';document.body.appendChild(el);}
    el.textContent=msg;
    el.classList.add('kn-share-toast--show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){el.classList.remove('kn-share-toast--show');},3200);
  }
  function copyText(text,msg){
    msg=msg||'Panoya kopyalandı';
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){showToast(msg);}).catch(function(){fallbackCopy(text,msg);});
    }else{fallbackCopy(text,msg);}
  }
  function copyLink(msg){copyText(productUrl(),msg||'Link kopyalandı');}
  function fallbackCopy(text,msg){
    try{
      var ta=document.createElement('textarea');
      ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';
      document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      showToast(msg);
    }catch(e){prompt('Kopyalayın:',text);}
  }
  function lockScroll(){document.documentElement.classList.add('kn-share-locked');}
  function unlockScroll(){document.documentElement.classList.remove('kn-share-locked');}
  function closeModal(){
    if(root){root.classList.remove('kn-share-open');}
    unlockScroll();
  }
  function openPopup(url,w,h){
    w=w||560;h=h||520;
    var left=Math.max(0,(window.screen.width-w)/2);
    var top=Math.max(0,(window.screen.height-h)/2);
    window.open(url,'kn-share-popup','width='+w+',height='+h+',left='+left+',top='+top+',scrollbars=yes,resizable=yes');
  }
  function isIOS(){return /iPhone|iPad|iPod/i.test(navigator.userAgent);}
  function isAndroid(){return /Android/i.test(navigator.userAgent);}
  function enc(s){return encodeURIComponent(s);}
  function openMobileApp(iosScheme,androidIntent,fallback){
    if(!isMobile()){if(fallback)fallback();return;}
    var url=isAndroid()?(androidIntent||iosScheme):iosScheme;
    if(!url){if(fallback)fallback();return;}
    var gone=false;
    var mark=function(){gone=true;};
    document.addEventListener('visibilitychange',mark);
    window.addEventListener('pagehide',mark);
    window.location.href=url;
    window.setTimeout(function(){
      document.removeEventListener('visibilitychange',mark);
      window.removeEventListener('pagehide',mark);
      if(!gone&&fallback)fallback();
    },2200);
  }
  function shareWhatsApp(){
    var text=shareText();
    var waWeb='https://wa.me/?text='+enc(text);
    if(!isMobile()){openPopup(waWeb,480,640);return;}
    openMobileApp(
      'whatsapp://send?text='+enc(text),
      'intent://send/?text='+enc(text)+'#Intent;scheme=whatsapp;package=com.whatsapp;end',
      function(){window.location.href=waWeb;}
    );
  }
  function shareFacebook(){
    var url=productUrl();
    var fbWeb='https://www.facebook.com/sharer/sharer.php?u='+enc(url);
    if(!isMobile()){openPopup(fbWeb,560,436);return;}
    openMobileApp(
      'fb://facewebmodal/f?href='+enc(url),
      'intent://www.facebook.com/sharer/sharer.php?u='+enc(url)+'#Intent;package=com.facebook.katana;scheme=https;end',
      function(){window.location.href=fbWeb;}
    );
  }
  function shareInstagram(){
    copyText(shareText(),'Mesaj metni kopyalandı');
    openMobileApp(
      'instagram://direct-inbox',
      'intent://instagram.com/direct/inbox/#Intent;package=com.instagram.android;scheme=https;end',
      function(){
        if(!isMobile())showToast('Instagram mesaj — mobil uygulamada açılır');
      }
    );
  }
  function platformBtn(id,name,action){
    var btn=document.createElement('button');
    btn.type='button';btn.className='kn-share-platform';
    btn.setAttribute('aria-label',name);
    btn.innerHTML='<span class="kn-share-platform-icon kn-share-platform-icon--'+id+'">'+ICONS[id]+'</span><span class="kn-share-platform-name">'+name+'</span>';
    btn.addEventListener('click',function(e){e.preventDefault();action();});
    return btn;
  }
  function buildDialog(){
    root=document.createElement('div');
    root.id='kn-share-root';
    root.innerHTML='<div class="kn-share-backdrop" data-close></div><div class="kn-share-dialog" role="dialog" aria-labelledby="kn-share-head" aria-modal="true"><button type="button" class="kn-share-close" data-close aria-label="Kapat">&times;</button><h2 id="kn-share-head" class="kn-share-head">Paylaş</h2><div class="kn-share-preview-card"><a class="kn-share-preview-link" href="#" tabindex="-1"><div class="kn-share-preview-thumb-wrap"><img class="kn-share-preview-thumb" alt="" hidden></div><div class="kn-share-preview-body"><div class="kn-share-preview-domain"></div><div class="kn-share-preview-linktitle"></div><div class="kn-share-preview-price"></div></div></a></div><p class="kn-share-section-label">Nereye paylaşmak istersiniz?</p><div class="kn-share-platforms"></div></div>';
    document.body.appendChild(root);
    root.querySelectorAll('[data-close]').forEach(function(el){el.addEventListener('click',closeModal);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
    var previewLink=root.querySelector('.kn-share-preview-link');
    previewLink.addEventListener('click',function(e){e.preventDefault();});
    var platforms=root.querySelector('.kn-share-platforms');
    platforms.appendChild(platformBtn('whatsapp','WhatsApp',shareWhatsApp));
    platforms.appendChild(platformBtn('facebook','Facebook',shareFacebook));
    platforms.appendChild(platformBtn('instagram','Mesaj',shareInstagram));
    platforms.appendChild(platformBtn('link','Link',function(){copyLink();}));
  }
  function refreshPreview(){
    if(!root)return;
    var thumb=root.querySelector('.kn-share-preview-thumb');
    var domain=root.querySelector('.kn-share-preview-domain');
    var linkTitle=root.querySelector('.kn-share-preview-linktitle');
    var price=root.querySelector('.kn-share-preview-price');
    if(domain)domain.textContent=siteDomain();
    if(linkTitle)linkTitle.textContent=SHARE.title;
    if(price)price.textContent=SHARE.priceLabel||'';
    if(thumb&&SHARE.imageUrl){thumb.src=SHARE.imageUrl;thumb.hidden=false;}
    else if(thumb){thumb.hidden=true;}
  }
  function openModal(){
    if(!root)buildDialog();
    refreshPreview();
    root.classList.add('kn-share-open');
    lockScroll();
  }
  function isQuickView(btn){
    var sec=btn.closest('variants-set');
    if(!sec)return false;
    var sid=sec.getAttribute('data-section')||'';
    return sid.indexOf('quick-view')>=0||sid.indexOf('drawer')>=0;
  }
  function mainCartButton(){
    var btns=qsa('#MainContent [data-add-to-cart]');
    for(var i=0;i<btns.length;i++){if(!isQuickView(btns[i]))return btns[i];}
    return null;
  }
  function findShareAnchor(){
    var main=qs('#MainContent');
    if(!main)return null;
    return qs('purchase-buttons .product-checkout-buttons',main)||qs('purchase-buttons',main)||qs('.product-checkout-buttons',main)||qs('.product--form-actions',main)||qs('.product--add-to-cart-wrapper',main);
  }
  function injectShareButton(){
    if(document.getElementById('kn-share-btn'))return;
    var btn=document.createElement('button');
    btn.type='button';btn.id='kn-share-btn';btn.className='kn-share-trigger';btn.textContent='Paylaş';
    btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openModal();});
    var anchor=findShareAnchor();
    if(anchor){anchor.appendChild(btn);return;}
    var cartBtn=mainCartButton();
    if(cartBtn&&cartBtn.parentElement){cartBtn.parentElement.appendChild(btn);return;}
    var sticky=qs('.sticky-buy-button-wrapper')||qs('sticky-buy-button');
    if(sticky)sticky.appendChild(btn);
  }
  function boot(){
    injectShareButton();
    if(!document.getElementById('kn-share-btn')){
      window.setTimeout(injectShareButton,120);
      window.setTimeout(injectShareButton,400);
    }
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}
  else{boot();}
})();`;
}

const SHARE_STYLES = `<style id="kn-product-share-styles">${SHARE_STYLES_CSS}</style>`;

/** İstemci / prebuild — iframe dokümanına paylaş butonu + modal */
export function applyMirrorProductShare(doc: Document, share: ProductSharePayload) {
  doc.getElementById("kn-product-share")?.remove();
  if (!doc.getElementById("kn-product-share-styles")) {
    const styleEl = doc.createElement("style");
    styleEl.id = "kn-product-share-styles";
    styleEl.textContent = SHARE_STYLES_CSS;
    doc.head.appendChild(styleEl);
  }
  const script = doc.createElement("script");
  script.id = "kn-product-share";
  script.textContent = buildShareScript(share);
  doc.body.appendChild(script);
}

export function injectMirrorProductShareHtml(html: string, share: ProductSharePayload): string {
  const script = `<script id="kn-product-share">${buildShareScript(share)}</script>`;
  let out = html.replace(/<script id="kn-product-share">[\s\S]*?<\/script>/i, "");
  out = out.replace(/<style id="kn-product-share-styles">[\s\S]*?<\/style>/i, "");
  if (!out.includes('id="kn-product-share-styles"')) {
    out = out.replace(/<\/head>/i, `${SHARE_STYLES}</head>`);
  }
  return out.replace(/<\/body>/i, `${script}</body>`);
}
