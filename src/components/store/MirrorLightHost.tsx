"use client";

import { useEffect, useRef } from "react";

/**
 * De-iframe pilotu (Faz B, light DOM varyantı) — iframe yerine tema HTML'ini
 * doğrudan normal DOM'a gömer. Shadow DOM'un aksine `@font-face` ve `html/body`
 * seçicileri çalışır (tasarım korunur).
 *
 * Temizlik: stiller <head>'e data-kn-light işaretiyle eklenir, body sınıfları
 * eklenir; unmount'ta hepsi geri alınır → diğer sayfalara sızmaz.
 *
 * NOT: innerHTML ile eklenen <script>'ler çalışmaz — nav/footer/branding
 * sunucuda enjekte edildiğinden statik/metin sayfalarda ekstra JS gerekmez.
 */
const MARK = "data-kn-light-theme";

export function MirrorLightHost({ html }: { html: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const addedNodes: Element[] = [];
    const addedBodyClasses: string[] = [];

    // Tema stil sayfaları + inline stiller → gerçek <head> (font-face çalışsın)
    for (const node of Array.from(
      parsed.head.querySelectorAll(
        'link[rel="stylesheet"], link[rel="preload"][as="style"], style',
      ),
    )) {
      const clone = node.cloneNode(true) as Element;
      clone.setAttribute(MARK, "1");
      document.head.appendChild(clone);
      addedNodes.push(clone);
    }

    // Tema body sınıfları → gerçek <body> (body.xxx seçicileri eşleşsin)
    const themeBodyClasses = Array.from(parsed.body.classList);
    for (const cls of themeBodyClasses) {
      if (!document.body.classList.contains(cls)) {
        document.body.classList.add(cls);
        addedBodyClasses.push(cls);
      }
    }

    // İçerik → wrapper (body innerHTML)
    wrap.innerHTML = parsed.body.innerHTML;

    return () => {
      for (const n of addedNodes) n.remove();
      for (const cls of addedBodyClasses) document.body.classList.remove(cls);
      wrap.innerHTML = "";
    };
  }, [html]);

  return <div ref={wrapRef} className="kn-store-light-root" />;
}
