/** Mobil uyumlu sayfa scroll kilidi — body position:fixed kullanmaz (layout kaymasını önler). */

const HTML_CLASS = "kn-scroll-locked";
const BODY_CLASS = "kn-scroll-locked";
const SCROLL_KEY = "knScrollLockY";

let lockCount = 0;
let unlockTimer: number | undefined;

function readSavedScrollY(): number {
  const raw = document.documentElement.dataset[SCROLL_KEY];
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function saveScrollY(y: number) {
  document.documentElement.dataset[SCROLL_KEY] = String(Math.max(0, Math.round(y)));
}

function clearSavedScrollY() {
  delete document.documentElement.dataset[SCROLL_KEY];
}

/** Tüm inline stilleri temizle — eski kilitten kalan artefaktları giderir */
export function resetBodyScrollLockStyles() {
  const html = document.documentElement;
  const body = document.body;
  html.classList.remove(HTML_CLASS);
  body.classList.remove(BODY_CLASS);
  html.style.removeProperty("overflow");
  html.style.removeProperty("overflow-x");
  body.style.removeProperty("overflow");
  body.style.removeProperty("overflow-x");
  body.style.removeProperty("position");
  body.style.removeProperty("top");
  body.style.removeProperty("left");
  body.style.removeProperty("right");
  body.style.removeProperty("width");
  body.style.removeProperty("padding-right");
  clearSavedScrollY();
}

export function lockBodyScroll(): void {
  if (typeof window === "undefined") return;

  if (lockCount === 0) {
    resetBodyScrollLockStyles();
    saveScrollY(window.scrollY);
    document.documentElement.classList.add(HTML_CLASS);
    document.body.classList.add(BODY_CLASS);
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof window === "undefined") return;
  if (lockCount <= 0) {
    resetBodyScrollLockStyles();
    return;
  }

  lockCount -= 1;
  if (lockCount > 0) return;

  const scrollY = readSavedScrollY();
  resetBodyScrollLockStyles();

  if (unlockTimer) window.clearTimeout(unlockTimer);
  unlockTimer = window.setTimeout(() => {
    window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    unlockTimer = undefined;
  }, 0);
}

/** Panel kapandıktan sonra layout düzeltmesi (iOS Safari) */
export function repairPageLayoutAfterOverlayClose() {
  if (typeof window === "undefined") return;
  const scrollY = readSavedScrollY();
  resetBodyScrollLockStyles();
  lockCount = 0;

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    });
  });
}
