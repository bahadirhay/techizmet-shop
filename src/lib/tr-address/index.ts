import "server-only";

import {
  getCities,
  getCityNames,
  getDistrictsByCityCode,
  getNeighbourhoodsByCityCodeAndDistrict,
  isCityName,
} from "turkey-neighbourhoods";
import { normalizeTrName } from "@/lib/tr-address/format";

export type TrCity = { code: string; name: string };

export { formatCheckoutLine1, splitSavedLine1 } from "@/lib/tr-address/format";

const cityCodeCache = new Map<string, string | null>();
const districtsCache = new Map<string, string[]>();
const neighborhoodsCache = new Map<string, string[]>();

let citiesCache: TrCity[] | null = null;

export function listTrCities(): TrCity[] {
  if (!citiesCache) {
    citiesCache = getCities().map((c) => ({ code: c.code, name: c.name }));
  }
  return citiesCache;
}

export function resolveTrCityCode(cityName: string): string | null {
  const name = normalizeTrName(cityName);
  if (!name) return null;
  if (cityCodeCache.has(name)) return cityCodeCache.get(name) ?? null;

  const cities = getCities();
  const exact = cities.find((c) => c.name === name);
  if (exact) {
    cityCodeCache.set(name, exact.code);
    return exact.code;
  }
  const folded = name.toLocaleLowerCase("tr-TR");
  const loose = cities.find((c) => c.name.toLocaleLowerCase("tr-TR") === folded);
  const code = loose?.code ?? null;
  cityCodeCache.set(name, code);
  return code;
}

export function listTrDistricts(cityName: string): string[] {
  const name = normalizeTrName(cityName);
  if (!name) return [];
  const cached = districtsCache.get(name);
  if (cached) return cached;

  const code = resolveTrCityCode(name);
  if (!code) return [];
  const list = getDistrictsByCityCode(code).slice().sort((a, b) => a.localeCompare(b, "tr"));
  districtsCache.set(name, list);
  return list;
}

export function listTrNeighborhoods(cityName: string, districtName: string): string[] {
  const city = normalizeTrName(cityName);
  const district = normalizeTrName(districtName);
  if (!city || !district) return [];

  const key = `${city}\0${district}`;
  const cached = neighborhoodsCache.get(key);
  if (cached) return cached;

  const code = resolveTrCityCode(city);
  if (!code) return [];
  const list = getNeighbourhoodsByCityCodeAndDistrict(code, district) ?? [];
  const sorted = list.slice().sort((a, b) => a.localeCompare(b, "tr"));
  neighborhoodsCache.set(key, sorted);
  return sorted;
}

export function isValidTrCityName(cityName: string): boolean {
  return isCityName(normalizeTrName(cityName));
}

export { getCityNames };
