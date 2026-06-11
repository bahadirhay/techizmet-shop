import "server-only";

import { parseGscServiceAccountFromEnv } from "@/lib/admin/gsc/auth";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSettings } from "@/lib/site-settings";

export type GscSettings = {
  enabled?: boolean;
  /** Örn. sc-domain:anatolianpaw.com veya https://anatolianpaw.com/ */
  property?: string;
  minClicks?: number;
  includeInBlogTopics?: boolean;
  /** Blog skorunda tıklama çarpanı (varsayılan 2) */
  clickWeight?: number;
};

export type ResolvedGscConfig = {
  enabled: boolean;
  property: string;
  minClicks: number;
  includeInBlogTopics: boolean;
  clickWeight: number;
  credentialsConfigured: boolean;
  serviceAccountEmail: string | null;
};

const DEFAULT_PROPERTY = "sc-domain:anatolianpaw.com";

export function parseGscSettings(raw: GscSettings | undefined): ResolvedGscConfig {
  const s = raw ?? {};
  const account = parseGscServiceAccountFromEnv();
  return {
    enabled: s.enabled !== false,
    property: s.property?.trim() || DEFAULT_PROPERTY,
    minClicks: clampInt(s.minClicks, 1, 1000, 1),
    includeInBlogTopics: s.includeInBlogTopics !== false,
    clickWeight: clampInt(s.clickWeight, 1, 10, 2),
    credentialsConfigured: Boolean(account),
    serviceAccountEmail: account?.client_email ?? null,
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function getGscConfig(siteId: string): Promise<ResolvedGscConfig> {
  const settings = await getSiteSettings(siteId);
  return parseGscSettings(settings.gsc);
}

export function toClientGscState(resolved: ResolvedGscConfig) {
  return {
    enabled: resolved.enabled,
    property: resolved.property,
    minClicks: resolved.minClicks,
    includeInBlogTopics: resolved.includeInBlogTopics,
    clickWeight: resolved.clickWeight,
    credentialsConfigured: resolved.credentialsConfigured,
    serviceAccountEmail: resolved.serviceAccountEmail,
  };
}

export type GscClientState = ReturnType<typeof toClientGscState>;

export function patchGscSettings(current: SiteSettings, patch: GscSettings): SiteSettings {
  return { ...current, gsc: { ...current.gsc, ...patch } };
}
