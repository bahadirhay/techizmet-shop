export type CounterpartyOcrFields = {
  title?: string;
  taxId?: string;
  taxOffice?: string;
  addressLine?: string;
  city?: string;
  district?: string;
  email?: string;
  phone?: string;
};

function cleanField(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[|]/g, "I")
    .replace(/[;:.,]+$/g, "")
    .trim();
}

export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function extractTaxId(text: string): string | undefined {
  const labeled = [
    /(?:V\.?\s*K\.?\s*N\.?|VERG[Iİİ]\s*K[Iİİ]ML[Iİİ]K\s*(?:NO|NUMARASI)?|T\.?\s*C\.?\s*K[Iİİ]ML[Iİİ]K\s*NO)\s*[:\-]?\s*(\d[\d\s.\-]{8,14})/gi,
    /(?:VKN|TCKN)\s*[:\-]?\s*(\d[\d\s.\-]{8,14})/gi,
  ];

  for (const pattern of labeled) {
    for (const match of text.matchAll(pattern)) {
      const digits = (match[1] ?? "").replace(/\D/g, "");
      if (digits.length === 10 || digits.length === 11) return digits;
    }
  }

  for (const line of text.split("\n")) {
    if (/TEL|TELEFON|FAKS|GSM/i.test(line)) continue;
    for (const match of line.matchAll(/\b(\d{10,11})\b/g)) {
      const digits = match[1] ?? "";
      if (digits.length === 10) return digits;
      if (digits.length === 11 && !digits.startsWith("05")) return digits;
    }
  }

  return undefined;
}

function extractTaxOffice(text: string): string | undefined {
  const inline = text.match(/VERG[Iİ]\s*DA[Iİ]RES[Iİ]\s*[:\-]\s*(.+?)(?:\n|$)/i);
  if (inline?.[1]) return cleanField(inline[1]);

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!/VERG[Iİ]\s*DA[Iİ]RES[Iİ]/i.test(line)) continue;
    const sameLine = line.match(/VERG[Iİ]\s*DA[Iİ]RES[Iİ]\s*[:\-]\s*(.+)/i);
    if (sameLine?.[1]) return cleanField(sameLine[1]);
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const next = cleanField(lines[j] ?? "");
      if (next && !/^(VKN|TCKN|ADRES|ÜNVAN)/i.test(next)) return next;
    }
  }

  return undefined;
}

function extractTitle(text: string, taxId?: string): string | undefined {
  const patterns = [
    /(?:T[Iİ]CARET\s*UNVANI|ÜNVAN|F[Iİ]RMA\s*(?:AD[Iİ]|UNVANI)|MÜKELLEF(?:İN)?\s*ÜNVANI)\s*[:\-]\s*(.+?)(?:\n|$)/i,
    /(?:ADI\s*SOYADI\s*VE\s*ÜNVANI|SOYAD[Iİ]\s*\/\s*ÜNVAN)\s*[:\-]\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const title = cleanField(match[1]);
      if (title.length >= 3 && title !== taxId) return title;
    }
  }

  for (const line of text.split("\n")) {
    if (line.length < 6) continue;
    if (/VERG[Iİ]|DA[Iİ]RE|ADRES|VKN|TCKN|TEL|FAKS|E-?POSTA|LEVHA/i.test(line)) continue;
    if (/^\d+$/.test(line.replace(/\s/g, ""))) continue;
    if (line === line.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(line)) {
      return cleanField(line);
    }
  }

  return undefined;
}

function parseAddressTail(tail: string): Pick<CounterpartyOcrFields, "addressLine" | "city" | "district"> {
  const cleaned = cleanField(tail);
  if (!cleaned) return {};

  const slashMatch = cleaned.match(
    /^(.+?)\s+(\d{5})?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*\/\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*$/,
  );
  if (slashMatch) {
    return {
      addressLine: cleanField(slashMatch[1] ?? ""),
      city: cleanField(slashMatch[3] ?? ""),
      district: cleanField(slashMatch[4] ?? ""),
    };
  }

  const reverseSlash = cleaned.match(
    /^(.+?)\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*\/\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*$/,
  );
  if (reverseSlash) {
    const left = cleanField(reverseSlash[1] ?? "");
    const partA = cleanField(reverseSlash[2] ?? "");
    const partB = cleanField(reverseSlash[3] ?? "");
    const bigCities = new Set([
      "İSTANBUL",
      "ANKARA",
      "İZMİR",
      "BURSA",
      "ANTALYA",
      "ADANA",
      "KONYA",
      "GAZİANTEP",
      "MERSİN",
      "KOCAELİ",
    ]);
    const city = bigCities.has(partB.toLocaleUpperCase("tr-TR")) ? partB : partA;
    const district = city === partB ? partA : partB;
    return { addressLine: left, city, district };
  }

  return { addressLine: cleaned };
}

function extractAddress(text: string): Pick<CounterpartyOcrFields, "addressLine" | "city" | "district"> {
  const blockMatch = text.match(
    /(?:İŞ\s*YER[Iİ]\s*ADRES[Iİ]|ADRES(?:\s*İ)?|YERLEŞ[Iİ]M\s*YER[Iİ])\s*[:\-]?\s*([\s\S]+?)(?:\n\s*(?:VERG[Iİ]|TEL|TELEFON|FAKS|E-?POSTA|WEB)|$)/i,
  );
  if (blockMatch?.[1]) {
    const lines = blockMatch[1]
      .split("\n")
      .map(cleanField)
      .filter(Boolean);
    if (lines.length === 0) return {};
    if (lines.length === 1) return parseAddressTail(lines[0]!);
    const last = lines[lines.length - 1]!;
    const tail = parseAddressTail(last);
    if (tail.city) {
      return {
        ...tail,
        addressLine: cleanField([...lines.slice(0, -1), tail.addressLine].filter(Boolean).join(" ")),
      };
    }
    return { addressLine: lines.join(" ") };
  }

  return {};
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase();
}

function extractPhone(text: string): string | undefined {
  const labeled = text.match(/(?:TEL|TELEFON|GSM|CEP)\s*[:\-]?\s*([+\d\s().\-]{10,18})/i);
  if (labeled?.[1]) {
    const digits = labeled[1].replace(/\D/g, "");
    if (digits.length >= 10) return formatTrPhone(digits);
  }
  return undefined;
}

function formatTrPhone(digits: string): string {
  const d = digits.startsWith("90") && digits.length === 12 ? digits.slice(2) : digits;
  if (d.length === 10) {
    return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  }
  if (d.length === 11 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  return digits;
}

/** Vergi levhası, fatura üst bilgisi vb. OCR metninden cari alanlarını çıkarır */
export function parseCounterpartyOcrText(raw: string): CounterpartyOcrFields {
  const text = normalizeOcrText(raw);
  if (!text.trim()) return {};

  const taxId = extractTaxId(text);
  const title = extractTitle(text, taxId);
  const taxOffice = extractTaxOffice(text);
  const address = extractAddress(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);

  const out: CounterpartyOcrFields = {};
  if (title) out.title = title;
  if (taxId) out.taxId = taxId;
  if (taxOffice) out.taxOffice = taxOffice;
  if (address.addressLine) out.addressLine = address.addressLine;
  if (address.city) out.city = address.city;
  if (address.district) out.district = address.district;
  if (email) out.email = email;
  if (phone) out.phone = phone;
  return out;
}
