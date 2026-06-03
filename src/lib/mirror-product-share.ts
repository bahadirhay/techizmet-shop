import type { ProductSharePayload } from "@/lib/product-share";

const SHARE_STYLES_CSS = `
html.kn-share-locked, html.kn-share-locked body { overflow: hidden; }
.kn-share-trigger{margin-left:.75rem;padding:.5rem 1rem;border:1px solid currentColor;border-radius:9999px;background:transparent;font-size:.875rem;cursor:pointer;opacity:.9;flex-shrink:0}
.kn-share-trigger:hover{opacity:1}
#kn-share-root{position:fixed;inset:0;z-index:10050;pointer-events:none;overflow:hidden}
#kn-share-root.kn-share-open{pointer-events:auto}
#kn-share-root .kn-share-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s;pointer-events:none}
#kn-share-root.kn-share-open .kn-share-backdrop{opacity:1;pointer-events:auto}
#kn-share-root .kn-share-dialog{position:absolute;left:50%;bottom:0;transform:translate(-50%,100%);width:min(100%,28rem);max-height:85vh;overflow:auto;background:#fff;border-radius:1rem 1rem 0 0;padding:1.25rem 1rem 1.5rem;box-shadow:0 -8px 32px rgba(0,0,0,.15);transition:transform .25s ease,opacity .25s ease;pointer-events:auto;box-sizing:border-box}
#kn-share-root.kn-share-open .kn-share-dialog{transform:translate(-50%,0)}
@media(min-width:768px){
  #kn-share-root .kn-share-dialog{bottom:auto;top:50%;transform:translate(-50%,calc(-50% + 1.5rem));border-radius:1rem;opacity:0}
  #kn-share-root.kn-share-open .kn-share-dialog{transform:translate(-50%,-50%);opacity:1}
}
.kn-share-close{position:absolute;top:.5rem;right:.75rem;border:0;background:0;font-size:1.5rem;line-height:1;cursor:pointer;color:#666}
.kn-share-product{display:flex;gap:.75rem;align-items:center;margin-bottom:1rem;padding-right:1.5rem}
.kn-share-img{width:4rem;height:4rem;object-fit:cover;border-radius:.5rem;background:#f4f4f5;flex-shrink:0}
.kn-share-title{font-size:1rem;font-weight:600;margin:0;line-height:1.3}
.kn-share-price{margin:.25rem 0 0;font-size:.875rem;color:#666}
.kn-share-lead{font-size:.8125rem;color:#666;margin:0 0 .75rem}
.kn-share-channels{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem}
.kn-share-channel{display:flex;flex-direction:column;align-items:flex-start;padding:.75rem;border:1px solid #e4e4e7;border-radius:.75rem;background:#fafafa;cursor:pointer;text-align:left}
.kn-share-channel:hover{background:#f4f4f5}
.kn-share-channel-label{font-weight:600;font-size:.875rem}
.kn-share-channel-hint{font-size:.6875rem;color:#71717a;margin-top:.15rem}
.kn-share-native{width:100%;margin-bottom:.75rem;padding:.65rem;border:0;border-radius:.5rem;background:#18181b;color:#fff;font-size:.875rem;cursor:pointer}
#kn-share-toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(120%);background:#18181b;color:#fff;padding:.5rem 1rem;border-radius:.5rem;font-size:.8125rem;z-index:10060;transition:transform .2s;pointer-events:none}
.kn-share-toast--show{transform:translateX(-50%) translateY(0)}
`;

function buildShareScript(share: ProductSharePayload): string {
  const json = JSON.stringify(share);
  return `(function(){
  var SHARE=${json};
  function qs(s,r){return (r||document).querySelector(s);}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function productUrl(){return location.origin+'/products/'+encodeURIComponent(SHARE.slug);}
  function shareText(){var u=productUrl();var t=[SHARE.title,SHARE.priceLabel,u].filter(Boolean);return t.join('\\n');}
  var root,toastTimer;
  function showToast(msg){
    var el=document.getElementById('kn-share-toast');
    if(!el){el=document.createElement('div');el.id='kn-share-toast';document.body.appendChild(el);}
    el.textContent=msg;
    el.classList.add('kn-share-toast--show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){el.classList.remove('kn-share-toast--show');},2800);
  }
  function copyLink(){
    var url=productUrl();
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){showToast('Link kopyalandı');}).catch(fallbackCopy);
    }else{fallbackCopy();}
    function fallbackCopy(){
      try{
        var ta=document.createElement('textarea');
        ta.value=url;ta.style.position='fixed';ta.style.left='-9999px';
        document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
        showToast('Link kopyalandı');
      }catch(e){prompt('Linki kopyalayın:',url);}
    }
    return url;
  }
  function lockScroll(){
    document.documentElement.classList.add('kn-share-locked');
  }
  function unlockScroll(){
    document.documentElement.classList.remove('kn-share-locked');
  }
  function closeModal(){
    if(root){root.classList.remove('kn-share-open');}
    unlockScroll();
  }
  function openModal(){
    if(!root){
      root=document.createElement('div');
      root.id='kn-share-root';
      root.innerHTML='<div class="kn-share-backdrop" data-close></div><div class="kn-share-dialog" role="dialog" aria-labelledby="kn-share-title" aria-modal="true"><button type="button" class="kn-share-close" data-close aria-label="Kapat">&times;</button><div class="kn-share-product"><img class="kn-share-img" alt="" hidden><div class="kn-share-meta"><h2 id="kn-share-title" class="kn-share-title"></h2><p class="kn-share-price"></p></div></div><p class="kn-share-lead">Bu ürünü paylaşın</p><div class="kn-share-channels"></div></div>';
      document.body.appendChild(root);
      root.querySelectorAll('[data-close]').forEach(function(el){
        el.addEventListener('click',closeModal);
      });
      document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
      var channels=root.querySelector('.kn-share-channels');
      var items=[
        {id:'whatsapp',label:'WhatsApp',hint:'Mesajla gönder',action:function(){
          window.open('https://wa.me/?text='+encodeURIComponent(shareText()),'_blank','noopener');
        }},
        {id:'instagram',label:'Instagram',hint:'Linki kopyala',action:function(){copyLink();showToast('Link kopyalandı — Instagram\\'da yapıştırın');}},
        {id:'tiktok',label:'TikTok',hint:'Linki kopyala',action:function(){copyLink();showToast('Link kopyalandı — TikTok\\'ta kullanın');}},
        {id:'youtube',label:'YouTube',hint:'Linki kopyala',action:function(){copyLink();showToast('Link kopyalandı — YouTube\\'da paylaşın');}},
        {id:'link',label:'Link',hint:'Kopyala',action:copyLink}
      ];
      items.forEach(function(it){
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='kn-share-channel kn-share-channel--'+it.id;
        btn.innerHTML='<span class="kn-share-channel-label">'+it.label+'</span><span class="kn-share-channel-hint">'+it.hint+'</span>';
        btn.addEventListener('click',function(){it.action();});
        channels.appendChild(btn);
      });
      if(navigator.share){
        var native=document.createElement('button');
        native.type='button';
        native.className='kn-share-native';
        native.textContent='Cihazda paylaş';
        native.addEventListener('click',function(){
          navigator.share({title:SHARE.title,text:SHARE.priceLabel,url:productUrl()}).catch(function(){});
        });
        root.querySelector('.kn-share-dialog').insertBefore(native,channels);
      }
    }
    var img=root.querySelector('.kn-share-img');
    var titleEl=root.querySelector('.kn-share-title');
    var priceEl=root.querySelector('.kn-share-price');
    if(titleEl)titleEl.textContent=SHARE.title;
    if(priceEl)priceEl.textContent=SHARE.priceLabel||'';
    if(img&&SHARE.imageUrl){img.src=SHARE.imageUrl;img.hidden=false;}else if(img){img.hidden=true;}
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
    for(var i=0;i<btns.length;i++){
      if(!isQuickView(btns[i]))return btns[i];
    }
    return null;
  }
  function findShareAnchor(){
    var main=qs('#MainContent');
    if(!main)return null;
    return qs('purchase-buttons .product-checkout-buttons',main)||
      qs('purchase-buttons',main)||
      qs('.product-checkout-buttons',main)||
      qs('.product--form-actions',main)||
      qs('.product--add-to-cart-wrapper',main);
  }
  function injectShareButton(){
    if(document.getElementById('kn-share-btn'))return;
    var btn=document.createElement('button');
    btn.type='button';
    btn.id='kn-share-btn';
    btn.className='kn-share-trigger';
    btn.textContent='Paylaş';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
    var anchor=findShareAnchor();
    if(anchor){
      anchor.appendChild(btn);
      return;
    }
    var cartBtn=mainCartButton();
    if(cartBtn&&cartBtn.parentElement){
      cartBtn.parentElement.appendChild(btn);
      return;
    }
    var sticky=qs('.sticky-buy-button-wrapper')||qs('sticky-buy-button');
    if(sticky){sticky.appendChild(btn);}
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
