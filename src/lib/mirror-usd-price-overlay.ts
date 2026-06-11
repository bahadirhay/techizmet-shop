/**
 * Mirror iframe içindeki TRY fiyatlarını USD'ye çeviren overlay.
 * `.product--actual-price` ve `.product--cut-price` elementlerini hedefler.
 */

const TRY_PRICE_RE = /^([\d.,]+)\s*₺$/;

/**
 * "115,00 ₺" gibi bir metni kuruş cinsinden sayıya çevirir.
 * Binlik ayırıcı olarak nokta, ondalık olarak virgül kabul eder (TR formatı).
 * Döndüremezse null döner.
 */
function parseTryText(text: string): number | null {
  const m = text.trim().match(TRY_PRICE_RE);
  if (!m) return null;
  // "1.299,00" → "1299.00"
  const normalized = m[1].replace(/\./g, "").replace(",", ".");
  const amount = parseFloat(normalized);
  if (isNaN(amount)) return null;
  return Math.round(amount * 100); // kuruş
}

function formatUsd(minorTry: number, usdTryRate: number): string {
  const usd = minorTry / 100 / usdTryRate;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

const PRICE_SELECTORS = [
  ".product--actual-price",
  ".product--cut-price",
  // Ürün detay sayfası fiyatları
  ".product-price",
  ".price__regular .price-item",
  ".price__sale .price-item",
].join(", ");

/**
 * `doc` içindeki tüm TRY fiyat elementlerini USD'ye çevirir.
 * Daha önce çevrilmiş elementleri tekrar işlemez (data-try-minor ile işaretlenir).
 */
export function applyMirrorUsdPrices(doc: Document, usdTryRate: number): void {
  if (!usdTryRate || usdTryRate <= 0) return;

  const els = doc.querySelectorAll<HTMLElement>(PRICE_SELECTORS);
  els.forEach((el) => {
    // Daha önce işlenmiş mi?
    if (el.dataset.tryMinor !== undefined) return;

    const text = el.textContent?.trim() ?? "";
    const minor = parseTryText(text);
    if (minor === null) return;

    // Orijinal kuruş değerini sakla (tekrar işlenmemesi için)
    el.dataset.tryMinor = String(minor);
    el.textContent = formatUsd(minor, usdTryRate);
  });
}
