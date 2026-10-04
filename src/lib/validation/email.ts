/**
 * Üyelik / hesap e-posta doğrulama — format + sahte/emoji engeli.
 * DNS (MX/A) kontrolü sunucu tarafında opsiyonel çağrılır.
 */

const EMAIL_MAX = 254;
const LOCAL_MAX = 64;

/** Emoji ve çoğu dekoratif sembol */
const EMOJI_OR_SYMBOL_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;

/** Basit ama sıkı format: yerel@alan.tld */
const EMAIL_FORMAT_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const DISPOSABLE_HINTS = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "throwaway.email",
  "getnada.com",
];

export type EmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function normalizeEmail(raw: string): string {
  return String(raw ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function validateEmailFormat(raw: string): EmailValidationResult {
  const email = normalizeEmail(raw);
  if (!email) return { ok: false, error: "E-posta gerekli." };
  if (email.length > EMAIL_MAX) return { ok: false, error: "E-posta çok uzun." };
  if (EMOJI_OR_SYMBOL_RE.test(email) || /[^\x00-\x7F]/.test(email)) {
    return { ok: false, error: "E-posta yalnızca standart karakterler içermelidir." };
  }
  if (email.includes("..") || email.startsWith(".") || email.includes("@.")) {
    return { ok: false, error: "Geçersiz e-posta formatı." };
  }
  if (!EMAIL_FORMAT_RE.test(email)) {
    return { ok: false, error: "Geçerli bir e-posta adresi girin." };
  }
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length > LOCAL_MAX) {
    return { ok: false, error: "Geçersiz e-posta formatı." };
  }
  if (!domain.includes(".") || domain.endsWith(".")) {
    return { ok: false, error: "E-posta alan adı eksik veya hatalı." };
  }
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) {
    return { ok: false, error: "E-posta alan adı geçersiz." };
  }
  if (DISPOSABLE_HINTS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { ok: false, error: "Geçici e-posta adresleri kabul edilmiyor." };
  }
  // Aynı karakterin aşırı tekrarı (spam lokal kısım)
  if (/(.)\1{5,}/i.test(local)) {
    return { ok: false, error: "Geçersiz e-posta adresi." };
  }
  return { ok: true, email };
}

/** Alan adında MX veya A kaydı var mı (Node DNS). Hata/timeout → geç (false negative önle). */
export async function emailDomainLooksReachable(
  email: string,
  timeoutMs = 2500,
): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const dns = await import("node:dns/promises");
    const check = async () => {
      try {
        const mx = await dns.resolveMx(domain);
        if (mx?.length) return true;
      } catch {
        /* MX yoksa A dene */
      }
      try {
        const a = await dns.resolve4(domain);
        if (a?.length) return true;
      } catch {
        /* */
      }
      try {
        const aaaa = await dns.resolve6(domain);
        if (aaaa?.length) return true;
      } catch {
        /* */
      }
      return false;
    };
    return await Promise.race([
      check(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), timeoutMs)),
    ]);
  } catch {
    return true;
  }
}
