import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";

/** Tema kabuğu pilotu — mirror iframe yerine React header/footer + vitrin içeriği */
export const THEME_SHELL_PILOT_SLUGS = ["privacy-policy"] as const satisfies readonly VitrinPageKey[];

export type ThemeShellPilotSlug = (typeof THEME_SHELL_PILOT_SLUGS)[number];

export function isThemeShellPilotSlug(slug: string): slug is ThemeShellPilotSlug {
  return (THEME_SHELL_PILOT_SLUGS as readonly string[]).includes(slug);
}

export function themeShellSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/pages\/([^/]+)$/);
  return m?.[1] ?? null;
}

export function isThemeShellPilotPath(pathname: string): boolean {
  const slug = themeShellSlugFromPath(pathname);
  return slug ? isThemeShellPilotSlug(slug) : false;
}

export type ThemeShellPilotQuery = {
  themeShell?: string | null;
  mirror?: string | null;
};

/** ?mirror=1 → iframe; ?themeShell=1 veya THEME_SHELL_PILOT_LIVE=1 → React kabuk */
export function isThemeShellEnabledForSlug(
  slug: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  if (!isThemeShellPilotSlug(slug)) return false;
  if (query?.mirror === "1") return false;
  if (query?.themeShell === "1") return true;
  return pilotLive;
}

export function isThemeShellEnabledForPath(
  pathname: string,
  query?: ThemeShellPilotQuery,
  pilotLive = process.env.THEME_SHELL_PILOT_LIVE === "1",
): boolean {
  const slug = themeShellSlugFromPath(pathname);
  return slug ? isThemeShellEnabledForSlug(slug, query, pilotLive) : false;
}
