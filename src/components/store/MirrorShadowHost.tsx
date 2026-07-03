"use client";

import { useEffect, useRef } from "react";

/**
 * De-iframe pilotu (Faz B) — iframe yerine tema HTML'ini Shadow DOM içine gömer.
 * Shadow DOM tema CSS'ini yalıtır (tasarım korunur) ama içerik ana belgenin
 * LCP kapsamındadır (iframe'in aksine LCP ölçülebilir olur).
 *
 * NOT: Shadow DOM içine innerHTML ile eklenen <script>'ler ÇALIŞMAZ. Bu yüzden
 * pilot yalnızca statik/metin sayfalar (privacy-policy gibi) için uygundur —
 * nav/footer/branding zaten sunucuda enjekte edildiğinden ekstra JS gerekmez.
 */
export function MirrorShadowHost({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.replaceChildren();

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const srcHead = parsed.head;
    const srcBody = parsed.body;

    // Tema stil sayfaları + inline stiller (shadow içinde izole)
    for (const node of Array.from(
      srcHead.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], style'),
    )) {
      root.appendChild(node.cloneNode(true));
    }

    // body{} kuralları shadow içinde eşleşmez — body sınıf/stilini sarmalayıcıya taşı
    // ve temel body kurallarını :host'a köprüle
    const shim = document.createElement("style");
    shim.textContent = `:host{display:block;width:100%;}`;
    root.appendChild(shim);

    const wrapper = document.createElement("div");
    wrapper.className = srcBody.className;
    const bodyStyle = srcBody.getAttribute("style");
    if (bodyStyle) wrapper.setAttribute("style", bodyStyle);
    wrapper.innerHTML = srcBody.innerHTML;
    root.appendChild(wrapper);
  }, [html]);

  return <div ref={hostRef} className="kn-store-shadow-root" />;
}
