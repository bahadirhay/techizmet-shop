import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const THEME_ROOT = join(process.cwd(), "public/theme/techizmet-shop");

/** Diskte bulunamayan görseller için yedek — kozmetik MG1 kaldırıldı */
const FALLBACK_REL: string | null = null;

const CDN_SUBDIRS = ["cdn/shop/files", "cdn/shop/collections", "cdn/shop/articles"] as const;

export type MirrorAssetResolver = {
  pickBest: (sub: string, requested: string) => string | null;
};

let resolverCache: MirrorAssetResolver | null = null;

export function getMirrorAssetResolver(): MirrorAssetResolver {
  if (resolverCache) return resolverCache;

  const byDir = new Map<string, string[]>();
  const fileSet = new Set<string>();

  for (const sub of CDN_SUBDIRS) {
    const dir = join(THEME_ROOT, sub);
    if (!existsSync(dir)) continue;
    const names = readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile());
    byDir.set(sub, names);
    for (const n of names) fileSet.add(`${sub}/${n}`);
  }

  function pickBest(sub: string, requested: string): string | null {
    const names = byDir.get(sub);
    if (!names?.length) {
      if (sub === "cdn/shop/articles") {
        return pickBest("cdn/shop/files", requested) ?? pickBest("cdn/shop/collections", requested);
      }
      return null;
    }
    if (fileSet.has(`${sub}/${requested}`)) return requested;

    const base = requested.includes(".")
      ? requested.slice(0, requested.lastIndexOf("."))
      : requested;
    const ext = requested.includes(".") ? requested.slice(requested.lastIndexOf(".")) : "";
    const escapedStem = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const httrackRe = new RegExp(`^${escapedStem}[0-9a-f]*${escapedExt}$`, "i");
    const candidates = names.filter((n) => n === requested || httrackRe.test(n));
    if (!candidates.length) return null;

    const dir = join(THEME_ROOT, sub);
    candidates.sort((a, b) => statSync(join(dir, b)).size - statSync(join(dir, a)).size);
    return candidates[0] ?? null;
  }

  resolverCache = { pickBest };
  return resolverCache;
}

/** HTTrack hash uyumsuzluklarını düzeltir (716cb → 7dcd2 vb.) */
export function fixMirrorCdnPathsInHtml(html: string): string {
  const { pickBest } = getMirrorAssetResolver();
  const re = /\/theme\/techizmet-shop\/(cdn\/shop\/(?:files|collections|articles)\/)([^"'<\s]+)/g;
  return html.replace(re, (full, prefix, filename) => {
    const sub = prefix.replace(/\/$/, "");
    const q = filename.indexOf("?");
    const bare = q >= 0 ? filename.slice(0, q) : filename;
    const query = q >= 0 ? filename.slice(q) : "";
    try {
      bare.split("/").forEach((seg: string) => {
        if (seg === ".." || seg === ".") throw new Error("path");
      });
    } catch {
      return full;
    }
    let decoded = bare;
    try {
      decoded = decodeURIComponent(bare);
    } catch {
      decoded = bare;
    }
    const actual = pickBest(sub, decoded);
    if (!actual || actual === bare) return full;
    return `/theme/techizmet-shop/${sub}/${actual}${query}`;
  });
}

export function resolveMirrorThemeFile(publicPath: string): { abs: string; rel: string } | null {
  const norm = publicPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!norm.startsWith("theme/techizmet-shop/cdn/shop/")) return null;

  const rest = norm.slice("theme/techizmet-shop/".length);
  const m = rest.match(/^(cdn\/shop\/(?:files|collections|articles)\/)(.+)$/i);
  if (!m) return null;

  const sub = m[1].replace(/\/$/, "");
  const requested = decodeURIComponent(m[2].split("?")[0] ?? "");
  if (!requested || requested.includes("..")) return null;

  let actual = getMirrorAssetResolver().pickBest(sub, requested);
  if (!actual) {
    if (!FALLBACK_REL) return null;
    const fb = join(process.cwd(), "public", FALLBACK_REL);
    if (existsSync(fb)) return { abs: fb, rel: FALLBACK_REL };
    return null;
  }

  const rel = `theme/techizmet-shop/${sub}/${actual}`;
  const abs = join(process.cwd(), "public", rel);
  if (!existsSync(abs)) {
    if (!FALLBACK_REL) return null;
    const fb = join(process.cwd(), "public", FALLBACK_REL);
    if (existsSync(fb)) return { abs: fb, rel: FALLBACK_REL };
    return null;
  }
  return { abs, rel };
}

export function readMirrorThemeFile(publicPath: string): Buffer | null {
  const resolved = resolveMirrorThemeFile(publicPath);
  if (!resolved) return null;
  try {
    return readFileSync(resolved.abs);
  } catch {
    return null;
  }
}
