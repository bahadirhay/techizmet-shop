import "server-only";

import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSettings } from "@/lib/site-settings";

export type BlogAutomationMode = "draft" | "auto";

export type BlogAutomationSettings = {
  enabled?: boolean;
  /** draft = taslak oluştur; auto = doğrudan yayınla */
  mode?: BlogAutomationMode;
  /** Örn. 0 9 * * 1,4 — Pazartesi ve Perşembe 09:00 */
  scheduleCron?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  maxPostsPerWeek?: number;
  minSearchCount?: number;
  minTopicScore?: number;
  linkProducts?: boolean;
  featuredOnHome?: boolean;
  includeProductViews?: boolean;
  author?: string;
};

export type ResolvedBlogAutomationConfig = {
  enabled: boolean;
  mode: BlogAutomationMode;
  scheduleCron: string;
  dateRangeFrom: string | null;
  dateRangeTo: string | null;
  maxPostsPerWeek: number;
  minSearchCount: number;
  minTopicScore: number;
  linkProducts: boolean;
  featuredOnHome: boolean;
  includeProductViews: boolean;
  author: string;
};

const DEFAULTS: ResolvedBlogAutomationConfig = {
  enabled: false,
  mode: "draft",
  scheduleCron: "0 9 * * 1,4",
  dateRangeFrom: null,
  dateRangeTo: null,
  maxPostsPerWeek: 2,
  minSearchCount: 2,
  minTopicScore: 4,
  linkProducts: true,
  featuredOnHome: false,
  includeProductViews: true,
  author: "",
};

export function parseBlogAutomationSettings(
  raw: BlogAutomationSettings | undefined,
): ResolvedBlogAutomationConfig {
  const s = raw ?? {};
  return {
    enabled: s.enabled === true,
    mode: s.mode === "auto" ? "auto" : "draft",
    scheduleCron: s.scheduleCron?.trim() || DEFAULTS.scheduleCron,
    dateRangeFrom: parseDateOnly(s.dateRangeFrom),
    dateRangeTo: parseDateOnly(s.dateRangeTo),
    maxPostsPerWeek: clampInt(s.maxPostsPerWeek, 1, 14, DEFAULTS.maxPostsPerWeek),
    minSearchCount: clampInt(s.minSearchCount, 1, 100, DEFAULTS.minSearchCount),
    minTopicScore: clampInt(s.minTopicScore, 1, 1000, DEFAULTS.minTopicScore),
    linkProducts: s.linkProducts !== false,
    featuredOnHome: s.featuredOnHome === true,
    includeProductViews: s.includeProductViews !== false,
    author: s.author?.trim() || "",
  };
}

function parseDateOnly(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function getBlogAutomationConfig(siteId: string): Promise<ResolvedBlogAutomationConfig> {
  const settings = await getSiteSettings(siteId);
  return parseBlogAutomationSettings(settings.blogAutomation);
}

export function isWithinAutomationDateRange(
  config: ResolvedBlogAutomationConfig,
  at = new Date(),
): boolean {
  const day = at.toISOString().slice(0, 10);
  if (config.dateRangeFrom && day < config.dateRangeFrom) return false;
  if (config.dateRangeTo && day > config.dateRangeTo) return false;
  return true;
}

export function toClientBlogAutomationState(
  raw: BlogAutomationSettings | undefined,
  resolved: ResolvedBlogAutomationConfig,
) {
  return {
    enabled: resolved.enabled,
    mode: resolved.mode,
    scheduleCron: resolved.scheduleCron,
    dateRangeFrom: resolved.dateRangeFrom ?? "",
    dateRangeTo: resolved.dateRangeTo ?? "",
    maxPostsPerWeek: resolved.maxPostsPerWeek,
    minSearchCount: resolved.minSearchCount,
    minTopicScore: resolved.minTopicScore,
    linkProducts: resolved.linkProducts,
    featuredOnHome: resolved.featuredOnHome,
    includeProductViews: resolved.includeProductViews,
    author: raw?.author?.trim() || resolved.author,
  };
}

export type BlogAutomationClientState = ReturnType<typeof toClientBlogAutomationState>;

export function patchBlogAutomationSettings(
  current: SiteSettings,
  patch: BlogAutomationSettings,
): SiteSettings {
  return {
    ...current,
    blogAutomation: { ...current.blogAutomation, ...patch },
  };
}
