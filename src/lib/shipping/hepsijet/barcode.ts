/** Türkçe karakterleri barkod için ASCII'ye çevirir (TECHİZMET → TECHIZMET). */
function asciiFold(value: string): string {
  return value
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/ı/g, "I")
    .replace(/Ş/gi, "S")
    .replace(/Ğ/gi, "G")
    .replace(/Ü/gi, "U")
    .replace(/Ö/gi, "O")
    .replace(/Ç/gi, "C");
}

/**
 * HepsiJet customerDeliveryNo: 8–21 karakter, kısaltma kodu ile başlar.
 * @see Retail TR Documentation
 */
export function buildHepsijetCustomerDeliveryNo(abbreviationCode: string, orderNumber: string): string {
  const prefix = asciiFold(abbreviationCode.trim())
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const suffix = asciiFold(orderNumber)
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  const minLen = 8;
  const maxLen = 21;
  const maxSuffix = Math.max(1, maxLen - prefix.length);
  let body = suffix.slice(-maxSuffix);
  if (!body) body = Date.now().toString(36).toUpperCase().slice(-maxSuffix);
  let barcode = `${prefix}${body}`;
  if (barcode.length < minLen) {
    barcode = `${barcode}${"0".repeat(minLen - barcode.length)}`;
  }
  return barcode.slice(0, maxLen);
}
