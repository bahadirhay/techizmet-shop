/** Vercel runtime env — trim + yaygın truthy değerler */
export function readThemeShellPilotLive(): boolean {
  const raw = process.env.THEME_SHELL_PILOT_LIVE;
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
