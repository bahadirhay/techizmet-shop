/** Şablon PDP dosyası farklı ürün slug ile kullanıldığında linkleri düzeltir */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function productStoreHref(slug: string): string {
  return `/products/${encodeURIComponent(slug)}`;
}

/** spectrum-sunscreen-spf-50 → kurutulmus-dana-akciger */
export function rewriteMirrorTemplateSlugReferences(
  doc: Document,
  templateSlug: string,
  productSlug: string,
): void {
  const tpl = templateSlug.trim().toLowerCase();
  const prod = productSlug.trim();
  if (!tpl || !prod || tpl === prod.toLowerCase()) return;

  const target = productStoreHref(prod);
  const tplHtml = new RegExp(`(^|[/"'])${escapeRegex(tpl)}\\.html`, "i");
  const tplPath = new RegExp(`/(?:[a-z]{2}(?:-[a-z]{2})?/)?products/${escapeRegex(tpl)}(?=[/?#"'&]|$)`, "i");

  for (const el of doc.querySelectorAll("[href], [data-url], [data-product-url], [action]")) {
    for (const attr of ["href", "data-url", "data-product-url", "action"] as const) {
      const raw = el.getAttribute(attr);
      if (!raw?.trim()) continue;
      let next = raw;
      if (tplHtml.test(raw)) {
        next = target;
      } else if (tplPath.test(raw)) {
        next = raw.replace(tplPath, `/products/${encodeURIComponent(prod)}`);
      }
      if (next !== raw) el.setAttribute(attr, next);
    }
  }

  doc.querySelectorAll('input[name="return_to"][value]').forEach((input) => {
    const raw = input.getAttribute("value") ?? "";
    if (tplPath.test(raw)) {
      input.setAttribute("value", raw.replace(tplPath, `/products/${encodeURIComponent(prod)}`));
    }
  });

  doc.querySelectorAll("form[action]").forEach((form) => {
    const action = form.getAttribute("action") ?? "";
    if (tplHtml.test(action) || tplPath.test(action)) {
      form.setAttribute("action", "#");
    }
  });

  // Inline scriptleri temizle:
  // 1. postMessage içerenleri tamamen kaldır — ping/route-sync mekanizması
  //    parent frame'e slug içeren mesaj gönderiyor, bu navigasyonu tetikliyor.
  // 2. postMessage içermeyip sadece slug referansı taşıyanları rewrite et.
  const slugRe = new RegExp(escapeRegex(tpl), "gi");
  doc.querySelectorAll("script:not([src])").forEach((el) => {
    const src = el.textContent ?? "";
    if (!src.trim()) return;
    // postMessage içeriyorsa → tamamen kaldır
    if (src.includes("postMessage")) {
      el.remove();
      return;
    }
    // Sadece slug referansı varsa → slug'ı değiştir
    if (slugRe.test(src)) {
      slugRe.lastIndex = 0;
      el.textContent = src.replace(slugRe, prod);
    }
  });
}

/** Shopify öneri widget + şablon keşfet kartları — yanlış ürüne gitmeyi önler */
export function suppressAliasedTemplateProductSections(doc: Document): void {
  doc.querySelectorAll("product-recommendations").forEach((el) => {
    el.removeAttribute("data-url");
    el.innerHTML = "";
    const sec = el.closest(".section-related-products, .kn-mirror-section.section-related-products") as Element | null;
    if (sec) (sec as HTMLElement).style.display = "none";
  });
}

/**
 * Mirror HTML içindeki tüm postMessage çağrılarını içeren inline scriptleri kaldırır.
 * ping / route-sync mekanizmaları parent frame'e navigasyon mesajı gönderiyor;
 * bunların tamamı DB verisiyle çalışan sayfada gereksiz ve zararlı.
 *
 * applyProductDetailFromAdmin dışında da (örn. collection frame) çağrılabilir.
 */
export function stripMirrorPostMessageScripts(doc: Document): void {
  doc.querySelectorAll("script:not([src])").forEach((el) => {
    if ((el.textContent ?? "").includes("postMessage")) {
      el.remove();
    }
  });
}

/**
 * Tema JS'inin şablon slug'ına yaptığı tüm navigasyon girişimlerini intercept eder.
 *
 * Kapsam:
 *   - history.pushState / replaceState
 *   - window.location.href = "..." (Location.prototype.href setter override)
 *   - window.location.assign / replace
 *   - window.top.location navigasyonu (iframe -> parent)
 *   - <a href> tıklamaları
 *   - MutationObserver ile dinamik eklenen linkler
 *
 * Script <head> başına eklenir — tema JS'inden önce yüklenmesi kritik.
 */
export function injectTemplateSlugNavigationGuard(
  doc: Document,
  templateSlug: string,
  productSlug: string,
): void {
  const tpl = templateSlug.trim();
  const prod = productSlug.trim();
  if (!tpl || !prod || tpl.toLowerCase() === prod.toLowerCase()) return;

  const id = "kn-template-slug-guard";
  doc.getElementById(id)?.remove();

  // Tüm değerler TS tarafında hesaplanıp JSON.stringify ile aktarılıyor.
  // script içinde hiç \ kaçış dizisi yok — TS/webpack parser hatası olmaz.
  const tplLc = tpl.toLowerCase();
  const escaped = tplLc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rePathSrc = JSON.stringify(`/(?:[a-z]{2}(?:-[a-z]{2})?/)?products/${escaped}(?=[/?#"'&]|$)`);
  const reHtmlSrc = JSON.stringify(`(^|[/"'])${escaped}\\.html`);
  const tplLcJson = JSON.stringify(tplLc);
  const prodJson = JSON.stringify(prod);
  const prodEncoded = JSON.stringify(encodeURIComponent(prod));

  const script = doc.createElement("script");
  script.id = id;
  script.textContent = [
    "(function(){",
    `var PROD=${prodJson};`,
    `var PROD_ENC=${prodEncoded};`,
    `var TPL_LC=${tplLcJson};`,
    `var RE_PATH=new RegExp(${rePathSrc},"i");`,
    `var RE_HTML=new RegExp(${reHtmlSrc},"i");`,
    "",
    "function fixUrl(url){",
    '  if(!url||typeof url!=="string")return url;',
    '  if(RE_PATH.test(url))return url.replace(RE_PATH,"/products/"+PROD_ENC);',
    '  if(RE_HTML.test(url))return "/products/"+PROD_ENC;',
    "  return url;",
    "}",
    "",
    "function isTplUrl(url){",
    '  if(!url||typeof url!=="string")return false;',
    "  var u=url.toLowerCase();",
    '  return u.indexOf("/products/"+TPL_LC)>=0||u.indexOf(TPL_LC+".html")>=0;',
    "}",
    "",
    "// 1. Location.prototype.href setter — window.location.href='...' atamasini yakalar",
    "try{",
    "  var _locProto=window.Location?window.Location.prototype:Object.getPrototypeOf(window.location);",
    "  var _hrefDesc=Object.getOwnPropertyDescriptor(_locProto,'href');",
    "  if(_hrefDesc&&_hrefDesc.set){",
    "    Object.defineProperty(_locProto,'href',{",
    "      get:_hrefDesc.get,",
    "      set:function(u){_hrefDesc.set.call(this,fixUrl(u));},",
    "      configurable:true",
    "    });",
    "  }",
    "}catch(e){}",
    "",
    "// 2. history.pushState / replaceState",
    "var _origPush=history.pushState.bind(history);",
    "var _origReplace=history.replaceState.bind(history);",
    "history.pushState=function(s,t,u){return _origPush(s,t,u?fixUrl(String(u)):u);};",
    "history.replaceState=function(s,t,u){return _origReplace(s,t,u?fixUrl(String(u)):u);};",
    "",
    "// 3. window.location.assign / replace metotlari",
    "try{",
    "  var _origAssign=window.location.assign.bind(window.location);",
    "  var _origLocReplace=window.location.replace.bind(window.location);",
    "  window.location.assign=function(u){return _origAssign(fixUrl(u));};",
    "  window.location.replace=function(u){return _origLocReplace(fixUrl(u));};",
    "}catch(e){}",
    "",
    "// 4. window.top Location override (iframe -> parent frame navigasyonu)",
    "try{",
    "  if(window.top&&window.top!==window){",
    "    var _topProto=window.top.Location?window.top.Location.prototype:Object.getPrototypeOf(window.top.location);",
    "    var _topHrefDesc=Object.getOwnPropertyDescriptor(_topProto,'href');",
    "    if(_topHrefDesc&&_topHrefDesc.set){",
    "      Object.defineProperty(_topProto,'href',{",
    "        get:_topHrefDesc.get,",
    "        set:function(u){_topHrefDesc.set.call(this,fixUrl(u));},",
    "        configurable:true",
    "      });",
    "    }",
    "    var _origTopAssign=window.top.location.assign.bind(window.top.location);",
    "    var _origTopReplace=window.top.location.replace.bind(window.top.location);",
    "    window.top.location.assign=function(u){return _origTopAssign(fixUrl(u));};",
    "    window.top.location.replace=function(u){return _origTopReplace(fixUrl(u));};",
    "  }",
    "}catch(e){}",
    "",
    "// 5. <a href> tiklama intercept (capture phase — tema JS'inden once)",
    'document.addEventListener("click",function(e){',
    "  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;",
    "  var t=e.target;if(!t||!t.closest)return;",
    '  var a=t.closest("a[href]");if(!a)return;',
    '  var href=a.getAttribute("href")||"";',
    "  if(!isTplUrl(href))return;",
    "  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();",
    "  var fixed=fixUrl(href);",
    "  try{(window.top||window).location.href=fixed;}catch(ex){window.location.href=fixed;}",
    "},true);",
    "",
    "// 6. MutationObserver — dinamik eklenen linkler",
    "try{",
    "  var _mo=new MutationObserver(function(muts){",
    "    muts.forEach(function(m){",
    "      m.addedNodes.forEach(function(node){",
    "        if(node.nodeType!==1)return;",
    "        var els=[];",
    '        if(node.matches&&node.matches("[href],[data-url],[data-product-url]"))els.push(node);',
    '        if(node.querySelectorAll)els=els.concat(Array.prototype.slice.call(node.querySelectorAll("[href],[data-url],[data-product-url]")));',
    "        els.forEach(function(el){",
    '          ["href","data-url","data-product-url"].forEach(function(attr){',
    "            var v=el.getAttribute(attr);",
    "            if(!v||!isTplUrl(v))return;",
    "            el.setAttribute(attr,fixUrl(v));",
    "          });",
    "        });",
    "      });",
    "    });",
    "  });",
    "  _mo.observe(document.documentElement,{childList:true,subtree:true});",
    "}catch(e){}",
    "})();",
  ].join("\n");

  // KRİTİK: <head> başına ekle — tema JS'inden ÖNCE yüklenmeli
  // body sonuna eklenirse tema zaten çalışmış olabilir
  const firstScript = doc.head.querySelector("script");
  if (firstScript) {
    doc.head.insertBefore(script, firstScript);
  } else {
    doc.head.appendChild(script);
  }
}