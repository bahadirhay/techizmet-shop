/** Giriş / kayıt sonrası güvenli iç yönlendirme */

const AUTH_PATH_PREFIXES = ["/account/login", "/account/register", "/account/forgot-password"];

export function sanitizeAccountReturnPath(
  next: string | null | undefined,
  fallback = "/account",
): string {
  if (!next?.trim()) return fallback;
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  if (AUTH_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}?`))) {
    return fallback;
  }
  return path;
}

export function accountLoginPath(returnTo?: string, fallback = "/account"): string {
  const target = sanitizeAccountReturnPath(returnTo, fallback);
  if (target === "/account") return "/account/login";
  return `/account/login?next=${encodeURIComponent(target)}`;
}

export function accountRegisterPath(returnTo?: string, fallback = "/account"): string {
  const target = sanitizeAccountReturnPath(returnTo, fallback);
  if (target === "/account") return "/account/register";
  return `/account/register?next=${encodeURIComponent(target)}`;
}
