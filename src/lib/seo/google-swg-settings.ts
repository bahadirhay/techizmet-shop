import type { SiteSettings } from "@/lib/site-settings";

export type GoogleSwgRuntimeConfig = {
  isPartOfProductId: string;
  theme: "light" | "dark";
  lang: string;
};

export type GoogleSwgSettings = {
  enabled?: boolean;
  /** Publisher Center'dan — örn. CAow6d_LDA:openaccess */
  isPartOfProductId?: string;
  theme?: "light" | "dark";
  lang?: string;
};

export function getGoogleSwgSettings(settings: SiteSettings): Required<GoogleSwgSettings> {
  const swg = settings.seo?.googleSwg ?? {};
  return {
    enabled: swg.enabled === true,
    isPartOfProductId: swg.isPartOfProductId?.trim() ?? "",
    theme: swg.theme === "dark" ? "dark" : "light",
    lang: swg.lang?.trim() || "tr",
  };
}

/** Blog sayfalarında yüklenecek SWG yapılandırması */
export function resolveGoogleSwgConfig(settings: SiteSettings): GoogleSwgRuntimeConfig | null {
  const swg = getGoogleSwgSettings(settings);
  if (!swg.enabled || !swg.isPartOfProductId) return null;
  return {
    isPartOfProductId: swg.isPartOfProductId,
    theme: swg.theme,
    lang: swg.lang,
  };
}
