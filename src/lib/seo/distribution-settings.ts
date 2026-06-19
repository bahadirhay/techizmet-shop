import type { SiteSettings } from "@/lib/site-settings";
import type { SiteDistributionSettings } from "@/lib/seo/distribution-types";

export function getSiteDistribution(settings: SiteSettings): SiteDistributionSettings {
  return settings.seo?.distribution ?? {};
}

export function mergeSiteDistribution(
  settings: SiteSettings,
  patch: SiteDistributionSettings,
): SiteSettings {
  return {
    ...settings,
    seo: {
      ...settings.seo,
      distribution: {
        ...getSiteDistribution(settings),
        ...patch,
        checklist: {
          ...getSiteDistribution(settings).checklist,
          ...patch.checklist,
        },
      },
    },
  };
}

export function patchDistributionChecklistItem(
  settings: SiteSettings,
  platformId: string,
  item: NonNullable<SiteDistributionSettings["checklist"]>[string],
): SiteSettings {
  const current = getSiteDistribution(settings);
  return mergeSiteDistribution(settings, {
    checklist: {
      ...current.checklist,
      [platformId]: item,
    },
  });
}
