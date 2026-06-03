export function normalizeTrName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function formatCheckoutLine1(neighborhood: string, streetLine: string): string {
  const hood = normalizeTrName(neighborhood);
  const line = streetLine.trim();
  if (hood && line) return `${hood}, ${line}`;
  return hood || line;
}

/** Kayıtlı adres satırından mahalle önekini ayır (mümkünse) */
export function splitSavedLine1(line1: string): { neighborhood: string; streetLine: string } {
  const raw = line1.trim();
  if (!raw) return { neighborhood: "", streetLine: "" };
  const comma = raw.indexOf(",");
  if (comma > 0) {
    return {
      neighborhood: raw.slice(0, comma).trim(),
      streetLine: raw.slice(comma + 1).trim(),
    };
  }
  return { neighborhood: "", streetLine: raw };
}
