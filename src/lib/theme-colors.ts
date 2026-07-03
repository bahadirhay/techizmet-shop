import type { SiteSettings } from "@/lib/site-settings";

/** Tema kabuğu renk ayarları — admin'den düzenlenebilir CSS değişken override'ları */
export type ThemeColorsSettings = {
  headerBackground?: string;
  headerText?: string;
  headerHover?: string;
  footerBackground?: string;
  footerText?: string;
  footerHeading?: string;
  brand?: string;
};

export type ThemeColorField = {
  key: keyof ThemeColorsSettings;
  label: string;
  /** Override edilecek CSS custom property'leri */
  cssVars: string[];
  /** Mirror varsayılanı — form renk kutusu boşken gösterilecek */
  fallback: string;
};

export const THEME_COLOR_FIELDS: ThemeColorField[] = [
  { key: "headerBackground", label: "Header arka planı", cssVars: ["--header_background"], fallback: "#ffffff" },
  { key: "headerText", label: "Header yazı rengi", cssVars: ["--header_color"], fallback: "#000000" },
  { key: "headerHover", label: "Menü üzerine gelince (hover)", cssVars: ["--header_hover_color"], fallback: "#df5021" },
  { key: "footerBackground", label: "Footer arka planı", cssVars: ["--footer_background"], fallback: "#0a171f" },
  { key: "footerText", label: "Footer yazı rengi", cssVars: ["--footer_color", "--footer_link_color"], fallback: "#c2c5c7" },
  { key: "footerHeading", label: "Footer başlık rengi", cssVars: ["--footer_heading_color"], fallback: "#ffffff" },
  { key: "brand", label: "Marka / vurgu rengi", cssVars: ["--kn-brand"], fallback: "#2d4a6f" },
];

export function getThemeColors(settings: SiteSettings | undefined): ThemeColorsSettings {
  return settings?.theme?.themeColors ?? {};
}

/** #rgb, #rrggbb veya rgb()/rgba() kabul — geçersiz değeri yok say (mirror varsayılanı kalır) */
function isValidColor(v: string | undefined): v is string {
  if (!v) return false;
  const s = v.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) || /^rgba?\([\d.,\s%]+\)$/.test(s);
}

/** Sadece admin'de girilen renkler için :root override — girilmeyenler mirror varsayılanı kalır */
export function buildThemeColorsOverrideCss(settings: SiteSettings | undefined): string {
  const colors = getThemeColors(settings);
  const decls: string[] = [];
  for (const field of THEME_COLOR_FIELDS) {
    const val = colors[field.key];
    if (isValidColor(val)) {
      for (const cssVar of field.cssVars) decls.push(`${cssVar}:${val.trim()};`);
    }
  }
  if (!decls.length) return "";
  return `:root{${decls.join("")}}`;
}
