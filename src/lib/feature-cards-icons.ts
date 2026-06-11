/** Özellik kartı ikonları — örnek vitrin tasarımına uygun SVG */

export type FeatureCardIconKey = "tr" | "globe" | "leaf" | "trophy";

export function featureCardIconHtml(key: FeatureCardIconKey): string {
  switch (key) {
    case "tr":
      return `<div class="kn-fc-icon kn-fc-icon--text">TR</div>`;
    case "globe":
      return `<div class="kn-fc-icon kn-fc-icon--svg" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" stroke="#2563eb" stroke-width="2.5"/><ellipse cx="24" cy="24" rx="8" ry="18" stroke="#2563eb" stroke-width="2"/><path d="M6 24h36M8 15h32M8 33h32" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
    case "leaf":
      return `<div class="kn-fc-icon kn-fc-icon--svg" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 38c14-2 22-10 26-26 0 0-10 2-18 10S8 38 8 38z" fill="#22c55e" opacity=".25"/><path d="M8 38c14-2 22-10 26-26 0 0-10 2-18 10S8 38 8 38z" stroke="#16a34a" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`;
    case "trophy":
      return `<div class="kn-fc-icon kn-fc-icon--svg" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 10h20v8c0 6-4 10-10 10s-10-4-10-10v-8z" fill="#eab308" opacity=".35"/><path d="M14 10h20v8c0 6-4 10-10 10s-10-4-10-10v-8z" stroke="#ca8a04" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 28v4h12v-4M20 32h8v4H20v-4z" stroke="#ca8a04" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 14h4c0 4 2 6 4 6M34 14h4c0 4-2 6-4 6" stroke="#ca8a04" stroke-width="2.2" stroke-linecap="round"/></svg></div>`;
  }
}

export const DEFAULT_FEATURE_CARD_ICONS: FeatureCardIconKey[] = ["tr", "globe", "leaf", "trophy"];
