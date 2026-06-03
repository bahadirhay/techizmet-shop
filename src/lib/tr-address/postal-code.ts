import "server-only";

import { resolveTrCityCode } from "@/lib/tr-address/index";

const cache = new Map<string, string>();

function cacheKey(cityName: string, districtName: string): string {
  return `${cityName.trim().toLocaleLowerCase("tr-TR")}|${districtName.trim().toLocaleLowerCase("tr-TR")}`;
}

/** İlçe posta kodu — turkiyeapi.dev (mahalle bazlı kodlar henüz tutarlı değil) */
export async function resolveTrDistrictPostalCode(
  cityName: string,
  districtName: string,
): Promise<string | null> {
  const city = cityName.trim();
  const district = districtName.trim();
  if (!city || !district) return null;

  const key = cacheKey(city, district);
  if (cache.has(key)) return cache.get(key) ?? null;

  if (!resolveTrCityCode(city)) return null;

  try {
    const url = new URL("https://turkiyeapi.dev/api/v1/districts");
    url.searchParams.set("province", city);
    url.searchParams.set("name", district);
    url.searchParams.set("activatePostalCodes", "true");
    const res = await fetch(url.toString(), { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { postalCode?: string }[] };
    const code = json.data?.[0]?.postalCode?.trim() ?? null;
    if (code) cache.set(key, code);
    return code;
  } catch {
    return null;
  }
}
