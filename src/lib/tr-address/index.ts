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

export function listTrCities(): TrCity[] {
  return getCities().map((c) => ({ code: c.code, name: c.name }));
}

export function resolveTrCityCode(cityName: string): string | null {
  const name = normalizeTrName(cityName);
  if (!name) return null;
  const cities = getCities();
  const exact = cities.find((c) => c.name === name);
  if (exact) return exact.code;
  const folded = name.toLocaleLowerCase("tr-TR");
  const loose = cities.find((c) => c.name.toLocaleLowerCase("tr-TR") === folded);
  return loose?.code ?? null;
}

export function listTrDistricts(cityName: string): string[] {
  const code = resolveTrCityCode(cityName);
  if (!code) return [];
  return getDistrictsByCityCode(code).slice().sort((a, b) => a.localeCompare(b, "tr"));
}

export function listTrNeighborhoods(cityName: string, districtName: string): string[] {
  const code = resolveTrCityCode(cityName);
  const district = normalizeTrName(districtName);
  if (!code || !district) return [];
  const list = getNeighbourhoodsByCityCodeAndDistrict(code, district) ?? [];
  return list.slice().sort((a, b) => a.localeCompare(b, "tr"));
}

export function isValidTrCityName(cityName: string): boolean {
  return isCityName(normalizeTrName(cityName));
}

export { getCityNames };
