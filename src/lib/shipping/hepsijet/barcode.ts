/** HepsiJet customerDeliveryNo: 9–16 karakter, kısaltma kodu ile başlar */
export function buildHepsijetCustomerDeliveryNo(abbreviationCode: string, orderNumber: string): string {
  const prefix = abbreviationCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const suffix = orderNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const minLen = 9;
  const maxLen = 16;
  const maxSuffix = Math.max(1, maxLen - prefix.length);
  let body = suffix.slice(-maxSuffix);
  if (!body) body = Date.now().toString(36).toUpperCase().slice(-maxSuffix);
  let barcode = `${prefix}${body}`;
  if (barcode.length < minLen) {
    barcode = `${barcode}${"0".repeat(minLen - barcode.length)}`;
  }
  return barcode.slice(0, maxLen);
}
