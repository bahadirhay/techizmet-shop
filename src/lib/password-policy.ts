export function validateNewPassword(plain: string): string | null {
  const p = plain.trim();
  if (p.length < 8) return "Şifre en az 8 karakter olmalı";
  if (p.length > 128) return "Şifre çok uzun";
  return null;
}
