/** İstemci + sunucu güvenli — prebuild tenant eşleşmesi */

export function mirrorPrebuildMatchesTenant(
  requestSlug: string,
  prebuildSlug: string | null,
): boolean {
  if (!prebuildSlug) return false;
  return prebuildSlug === requestSlug;
}
