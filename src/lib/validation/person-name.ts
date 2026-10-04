/**
 * Üyelik adı/soyadı — emoji ve anlamsız spam metin engeli.
 */

const EMOJI_OR_SYMBOL_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;

const LETTER_RE = /\p{L}/u;

export type PersonNameValidationResult =
  | { ok: true; firstName: string; lastName: string }
  | { ok: false; error: string };

function cleanPart(raw: string): string {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeSpamLatin(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 12) return false;
  // Latin ağırlıklıysa ünlü oranı çok düşükse klavye spam
  const latin = compact.replace(/[^a-zA-Z]/g, "");
  if (latin.length < 10) return false;
  const vowels = (latin.match(/[aeiouAEIOU]/g) ?? []).length;
  if (vowels / latin.length < 0.15) return true;
  // Tek kelime aşırı uzun
  if (value.split(/\s+/).some((w) => w.length > 28)) return true;
  // Aynı 2-3 harflik kalıbın tekrarı (jejjej, nsnnsn)
  if (/(.{2,4})\1{3,}/i.test(compact)) return true;
  return false;
}

function validateOneName(label: string, value: string, required: boolean): string | null {
  if (!value) {
    return required ? `${label} gerekli.` : null;
  }
  if (value.length > 60) return `${label} çok uzun (en fazla 60 karakter).`;
  if (value.length < 2 && required) return `${label} en az 2 karakter olmalı.`;
  if (EMOJI_OR_SYMBOL_RE.test(value)) {
    return `${label} emoji veya özel sembol içeremez.`;
  }
  // Kontrol karakterleri / zero-width
  if (/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/.test(value)) {
    return `${label} geçersiz karakter içeriyor.`;
  }
  if (/(.)\1{4,}/u.test(value)) {
    return `${label} geçersiz görünüyor.`;
  }
  const letters = [...value].filter((c) => LETTER_RE.test(c)).length;
  if (letters < 2) {
    return `${label} en az iki harf içermelidir.`;
  }
  // Harf oranı çok düşükse (çoğu noktalama / rakam)
  if (letters / value.replace(/\s/g, "").length < 0.5) {
    return `${label} geçersiz görünüyor.`;
  }
  if (looksLikeSpamLatin(value)) {
    return `${label} geçersiz görünüyor. Lütfen gerçek adınızı yazın.`;
  }
  return null;
}

export function validatePersonName(input: {
  firstName?: string;
  lastName?: string;
  requireFirstName?: boolean;
  requireLastName?: boolean;
}): PersonNameValidationResult {
  const firstName = cleanPart(input.firstName ?? "");
  const lastName = cleanPart(input.lastName ?? "");
  const requireFirst = input.requireFirstName !== false;
  const requireLast = input.requireLastName === true;

  const errFirst = validateOneName("Ad", firstName, requireFirst);
  if (errFirst) return { ok: false, error: errFirst };
  const errLast = validateOneName("Soyad", lastName, requireLast);
  if (errLast) return { ok: false, error: errLast };

  if (!firstName && !lastName) {
    return { ok: false, error: "Ad gerekli." };
  }

  return { ok: true, firstName, lastName };
}
