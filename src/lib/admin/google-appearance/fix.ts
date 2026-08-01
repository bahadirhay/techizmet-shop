import "server-only";

import { revalidatePath } from "next/cache";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { clearDevMirrorHtmlCache } from "@/lib/mirror-html-build";
import {
  applyLegacyThemeCopyToText,
  findLegacyThemeHits,
} from "@/lib/mirror-theme-copy-sanitize";
import { normalizeRobotsDisallowPaths } from "@/lib/seo/robots-disallow-paths";
import { VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

const REQUIRED_ROBOTS_DISALLOW = ["/_mirror-prebuilt/", "/theme/techizmet-shop/mirror/"];

export type GoogleAppearanceFixResult = {
  updatedSettings: boolean;
  patchedFields: number;
  robotsDisallowAdded: string[];
  details: string[];
};

function deepFixString(value: string, siteName: string): { next: string; changed: boolean } {
  if (!findLegacyThemeHits(value).length && !/theking-noor/i.test(value)) {
    return { next: value, changed: false };
  }
  // TR öncelikli — mağaza TR; EN metinler de aynı listeden geçer
  const tr = applyLegacyThemeCopyToText(value, "tr", siteName);
  const en = applyLegacyThemeCopyToText(tr, "en", siteName);
  return { next: en, changed: en !== value };
}

function fixStoreTexts(
  settings: SiteSettings,
  siteName: string,
  details: string[],
): { settings: SiteSettings; count: number } {
  const texts = settings.store?.texts;
  if (!texts || typeof texts !== "object") return { settings, count: 0 };
  let count = 0;
  const nextTexts: Record<string, unknown> = { ...texts };
  for (const [key, value] of Object.entries(texts)) {
    if (typeof value !== "string") continue;
    const { next, changed } = deepFixString(value, siteName);
    if (changed) {
      nextTexts[key] = next;
      count += 1;
      details.push(`store.texts.${key}`);
    }
  }
  // Bilinen skincare varsayılanlarını zorla düzelt
  const forced: Record<string, string> = {
    collectionsListTitleEn: "Our Collections",
    collectionsListTitleTr: "Koleksiyonlarımız",
    collectionsListLeadEn:
      "Natural dog treats and grain-free rewards for training and everyday care.",
    collectionsListLeadTr: "Doğal köpek ödül mamaları ve tahılsız atıştırmalıklar.",
  };
  for (const [key, good] of Object.entries(forced)) {
    const cur = typeof nextTexts[key] === "string" ? (nextTexts[key] as string) : "";
    if (!cur.trim() || findLegacyThemeHits(cur).length) {
      if (cur !== good) {
        nextTexts[key] = good;
        count += 1;
        details.push(`store.texts.${key}=forced`);
      }
    }
  }
  if (!count) return { settings, count: 0 };
  return {
    settings: {
      ...settings,
      store: { ...settings.store, texts: nextTexts as typeof texts },
    },
    count,
  };
}

function fixSeoBlock(
  settings: SiteSettings,
  siteName: string,
  details: string[],
): { settings: SiteSettings; count: number } {
  const seo = { ...(settings.seo ?? {}) };
  let count = 0;

  for (const key of ["metaDescription", "siteTitle", "organizationName", "metaKeywords"] as const) {
    const cur = seo[key];
    if (typeof cur !== "string") continue;
    const { next, changed } = deepFixString(cur, siteName);
    if (changed) {
      seo[key] = next;
      count += 1;
      details.push(`seo.${key}`);
    }
  }

  const staticPages = { ...(seo.staticPages ?? {}) };
  for (const [path, meta] of Object.entries(staticPages)) {
    const nextMeta = { ...meta };
    let pageChanged = false;
    for (const field of ["seoTitle", "seoDescription", "imageAlt"] as const) {
      const cur = nextMeta[field];
      if (typeof cur !== "string") continue;
      const { next, changed } = deepFixString(cur, siteName);
      if (changed) {
        nextMeta[field] = next;
        pageChanged = true;
        details.push(`seo.staticPages[${path}].${field}`);
      }
    }
    if (pageChanged) {
      staticPages[path] = nextMeta;
      count += 1;
    }
  }
  seo.staticPages = staticPages;

  const existing = normalizeRobotsDisallowPaths(seo.robotsDisallowPaths);
  const robotsAdded: string[] = [];
  const robotsSet = new Set(existing);
  for (const path of REQUIRED_ROBOTS_DISALLOW) {
    if (!robotsSet.has(path)) {
      robotsSet.add(path);
      robotsAdded.push(path);
    }
  }
  seo.robotsDisallowPaths = [...robotsSet];

  return {
    settings: { ...settings, seo },
    count: count + (robotsAdded.length ? 1 : 0),
  };
}

function fixMirrorPages(
  settings: SiteSettings,
  siteName: string,
  details: string[],
): { settings: SiteSettings; count: number; robotsAdded: string[] } {
  const theme = { ...(settings.theme ?? {}) };
  const mirrorPages = { ...(theme.mirrorPages ?? {}) };
  let count = 0;

  for (const page of VITRIN_PAGES) {
    const cfg = getMirrorPageConfig(settings, page.key);
    const elements = { ...(cfg.elements ?? {}) };
    let pageChanged = false;

    for (const [elId, edit] of Object.entries(elements)) {
      const e = edit as { html?: string; htmlEn?: string; text?: string };
      let nextEdit = { ...edit };
      let elChanged = false;
      for (const field of ["html", "htmlEn", "text"] as const) {
        const cur = e[field];
        if (typeof cur !== "string") continue;
        const { next, changed } = deepFixString(cur, siteName);
        if (changed) {
          nextEdit = { ...nextEdit, [field]: next };
          elChanged = true;
          count += 1;
          details.push(`${page.key}.elements.${elId}.${field}`);
        }
      }
      if (elChanged) {
        elements[elId] = nextEdit;
        pageChanged = true;
      }
    }

    const sections = { ...(cfg.sections ?? {}) };
    for (const [sectionKey, section] of Object.entries(sections)) {
      if (!section) continue;
      let sectionNext = { ...section };
      let sectionChanged = false;
      for (const field of ["headingHtml", "marqueeHtml"] as const) {
        const cur = section[field];
        if (typeof cur !== "string") continue;
        const { next, changed } = deepFixString(cur, siteName);
        if (changed) {
          sectionNext = { ...sectionNext, [field]: next };
          sectionChanged = true;
          count += 1;
          details.push(`${page.key}.sections.${sectionKey}.${field}`);
        }
      }
      if (sectionChanged) {
        sections[sectionKey] = sectionNext;
        pageChanged = true;
      }
    }

    if (pageChanged) {
      mirrorPages[page.key] = {
        ...cfg,
        elements,
        sections,
      };
    }
  }

  // robots disallow return via fixSeoBlock
  return {
    settings: {
      ...settings,
      theme: { ...theme, mirrorPages },
    },
    count,
    robotsAdded: [],
  };
}

export async function fixGoogleAppearance(siteId: string): Promise<GoogleAppearanceFixResult> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site yok");

  let settings = parseSiteSettings(site.settingsJson);
  const details: string[] = [];
  let patchedFields = 0;

  const texts = fixStoreTexts(settings, site.name, details);
  settings = texts.settings;
  patchedFields += texts.count;

  const seoFix = fixSeoBlock(settings, site.name, details);
  settings = seoFix.settings;
  patchedFields += seoFix.count;

  const beforeRobots = new Set(
    normalizeRobotsDisallowPaths(parseSiteSettings(site.settingsJson).seo?.robotsDisallowPaths),
  );
  const afterRobots = normalizeRobotsDisallowPaths(settings.seo?.robotsDisallowPaths);
  const robotsDisallowAdded = afterRobots.filter((p) => !beforeRobots.has(p));

  const mirrorFix = fixMirrorPages(settings, site.name, details);
  settings = mirrorFix.settings;
  patchedFields += mirrorFix.count;

  const updatedSettings = patchedFields > 0 || robotsDisallowAdded.length > 0;
  if (updatedSettings) {
    await prisma.storeSite.update({
      where: { id: siteId },
      data: { settingsJson: JSON.stringify(settings) },
    });
  }

  clearDevMirrorHtmlCache();
  revalidateStorePublicCache(siteId);
  for (const path of [
    "/",
    "/collections",
    "/collections/all",
    "/pages/about",
    "/pages/faq",
    "/blogs/news",
    "/robots.txt",
  ]) {
    revalidatePath(path);
  }

  return {
    updatedSettings,
    patchedFields,
    robotsDisallowAdded,
    details: details.slice(0, 80),
  };
}
