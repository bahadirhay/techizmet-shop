/** @deprecated — use mirror-page-sections */
export {
  loadMirrorHomeSectionsCatalog,
  loadMirrorPageSectionsCatalog,
  extractMirrorPageSections as extractMirrorHomeSections,
} from "@/lib/mirror-page-sections";

export type {
  MirrorHomeConfig,
  MirrorHomeSection,
  MirrorHomeSectionEdit,
} from "@/lib/mirror-home-overlay";

import type { SiteSettings } from "@/lib/site-settings";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";

export function getMirrorHomeConfig(settings: SiteSettings) {
  return getMirrorPageConfig(settings, "home");
}
