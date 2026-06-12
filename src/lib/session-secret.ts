const DEV_SECRET = "dev-insecure-secret-min-32-chars!!";

let warnedInsecure = false;

/** Oturum çerezi imzalama — production'da zayıf secret kullanılmaz */
export function resolveSessionSecret(): string {
  const trimmed = (process.env.SESSION_SECRET ?? "").trim();
  if (trimmed.length >= 32) return trimmed;

  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  if (isProd) {
    throw new Error(
      "SESSION_SECRET eksik veya 32 karakterden kısa. Vercel ortam değişkenlerine güçlü bir secret ekleyin.",
    );
  }

  if (!warnedInsecure) {
    warnedInsecure = true;
    console.warn("[security] SESSION_SECRET yok — yalnızca yerel geliştirme anahtarı kullanılıyor.");
  }
  return DEV_SECRET;
}
