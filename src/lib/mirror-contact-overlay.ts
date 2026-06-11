/** Mirror iframe — iletişim sayfası harita overlay */

export type ContactMapPosition = "left" | "top" | "bottom" | "hidden";

export type MirrorContactData = {
  mapEmbedUrl?: string;
  mapPosition?: ContactMapPosition;
};

const CONTACT_STYLE_ID = "kn-contact-map-styles";

function ensureContactStyles(doc: Document) {
  if (doc.getElementById(CONTACT_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = CONTACT_STYLE_ID;
  style.textContent = `
    /* Harita sol (varsayılan) — mevcut style-both grid devreye girer */
    .contact-form--wrapper.kn-map-left .contact-form--map-box { min-height: 400px; }

    /* Harita üst — tam genişlik, form altında */
    .contact-form--wrapper.kn-map-top {
      display: flex !important;
      flex-direction: column !important;
      grid-template-columns: none !important;
    }
    .contact-form--wrapper.kn-map-top .contact-form--map-box {
      width: 100% !important;
      height: 400px !important;
      order: -1;
    }

    /* Harita alt — tam genişlik, form üstünde */
    .contact-form--wrapper.kn-map-bottom {
      display: flex !important;
      flex-direction: column !important;
      grid-template-columns: none !important;
    }
    .contact-form--wrapper.kn-map-bottom .contact-form--map-box {
      width: 100% !important;
      height: 400px !important;
      order: 1;
    }

    /* iframe harita boyutlandırma */
    .contact-form--map-box iframe[data-kn-map] {
      width: 100% !important;
      height: 100% !important;
      min-height: 400px;
      border: none;
      display: block;
    }

    /* Eski <map-element> gizle */
    .contact-form--map-box map-element { display: none !important; }
  `;
  (doc.head ?? doc.documentElement).appendChild(style);
}

function resolveMapUrl(raw: string): string {
  if (!raw.trim()) return "";
  // Tam <iframe src="..."> HTML yapıştırılmışsa src'yi ayıkla
  const match = raw.match(/\bsrc=["']([^"']+)["']/);
  return match ? match[1] : raw.trim();
}

/** İstemci: iframe içindeki harita elementini güncelle */
export function applyMirrorContact(doc: Document, contact: MirrorContactData) {
  const mapBox = doc.querySelector<HTMLElement>(".contact-form--map-box");
  const wrapper = doc.querySelector<HTMLElement>(".contact-form--wrapper");

  if (!mapBox || !wrapper) return;
  ensureContactStyles(doc);

  const pos = contact.mapPosition ?? "left";

  if (pos === "hidden") {
    mapBox.style.display = "none";
    wrapper.classList.remove("kn-map-top", "kn-map-bottom", "kn-map-left");
    return;
  }

  mapBox.style.display = "";

  // Konum sınıflarını güncelle
  wrapper.classList.remove("kn-map-top", "kn-map-bottom", "kn-map-left");
  if (pos === "top") wrapper.classList.add("kn-map-top");
  else if (pos === "bottom") wrapper.classList.add("kn-map-bottom");
  else wrapper.classList.add("kn-map-left");

  const mapUrl = resolveMapUrl(contact.mapEmbedUrl ?? "");
  if (!mapUrl.startsWith("http")) return;

  // Eski <map-element> varsa temizle (tarayıcı cache'li eski HTML durumu)
  const oldMapEl = mapBox.querySelector("map-element");
  if (oldMapEl) oldMapEl.remove();

  // data-kn-map iframe varsa src güncelle, yoksa oluştur
  let iframe = mapBox.querySelector<HTMLIFrameElement>("iframe[data-kn-map]");
  if (!iframe) {
    // Eski içerikleri tamamen temizle
    mapBox.innerHTML = "";
    iframe = doc.createElement("iframe");
    iframe.setAttribute("data-kn-map", "1");
    iframe.style.cssText =
      "width:100%;height:100%;min-height:400px;border:none;display:block;";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    mapBox.appendChild(iframe);
  }

  if (iframe.src !== mapUrl) {
    iframe.src = mapUrl;
  }
}
