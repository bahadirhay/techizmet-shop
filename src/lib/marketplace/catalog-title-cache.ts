import { prisma } from "@/lib/prisma";
import type { MarketplaceCatalogItem } from "@/lib/marketplace/catalog-types";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

const MAX_CACHED_TITLES = 800;

/** Katalog çekiminden sonra başlıkları entegrasyon config'ine yazar — SEO ve eşleme için yerel kaynak */
export async function persistCatalogTitleCache(
  siteId: string,
  platform: string,
  items: MarketplaceCatalogItem[],
): Promise<number> {
  const titles = items
    .map((i) => i.title?.trim())
    .filter((t): t is string => Boolean(t && t.length > 5));
  if (!titles.length) return 0;

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId, platform },
  });
  if (!integration) return 0;

  const config = parseConfig(integration.configJson);
  const unique = [...new Set(titles)].slice(0, MAX_CACHED_TITLES);
  config.catalogTitlesCache = JSON.stringify(unique);
  config.catalogTitlesCachedAt = new Date().toISOString();

  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: { configJson: JSON.stringify(config) },
  });
  return unique.length;
}

export function readCatalogTitleCache(config: Record<string, string> | null): {
  titles: string[];
  cachedAt: string | null;
} {
  if (!config?.catalogTitlesCache) return { titles: [], cachedAt: null };
  try {
    const parsed = JSON.parse(config.catalogTitlesCache) as unknown;
    if (!Array.isArray(parsed)) return { titles: [], cachedAt: null };
    const titles = parsed
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t.length > 5);
    return { titles, cachedAt: config.catalogTitlesCachedAt ?? null };
  } catch {
    return { titles: [], cachedAt: null };
  }
}
