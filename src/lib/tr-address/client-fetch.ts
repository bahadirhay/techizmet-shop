/** İl / ilçe / mahalle — istemci tarafı tekrarlayan istekleri önler */

const cache = new Map<string, unknown>();

export async function fetchTrAddressJson<T>(url: string): Promise<T | null> {
  const hit = cache.get(url);
  if (hit !== undefined) return hit as T;

  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    cache.set(url, data);
    return data;
  } catch {
    return null;
  }
}

export function primeTrAddressCache<T>(url: string, data: T): void {
  cache.set(url, data);
}
