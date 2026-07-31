/** robots.txt Disallow satırları — admin metin alanından */
export function normalizeRobotsDisallowPaths(raw: unknown): string[] {
  const lines: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") lines.push(item);
    }
  } else if (typeof raw === "string") {
    lines.push(...raw.split(/\r?\n/));
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    let path = line.trim();
    if (!path || path.startsWith("#")) continue;
    if (/^https?:\/\//i.test(path)) {
      try {
        path = new URL(path).pathname || "/";
      } catch {
        continue;
      }
    }
    if (!path.startsWith("/")) path = `/${path}`;
    // Kökü tamamen kapatmayı engelle — robotsIndex bunun için
    if (path === "/" || path === "/*") continue;
    if (path.length > 500) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(path);
    if (out.length >= 100) break;
  }
  return out;
}
