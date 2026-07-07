/** Trendyol resmi kargo firma listesi (createProduct V2 cargoCompanyId).
 *  Kaynak: developers.trendyol.com getProviders tablosu. Client + server ortak. */
export const TRENDYOL_CARGO_PROVIDERS: { id: number; code: string; name: string }[] = [
  { id: 4, code: "YKMP", name: "Yurtiçi Kargo" },
  { id: 7, code: "ARASMP", name: "Aras Kargo" },
  { id: 9, code: "SURATMP", name: "Sürat Kargo" },
  { id: 6, code: "HOROZMP", name: "Horoz Kargo" },
  { id: 10, code: "DHLECOMMP", name: "DHL eCommerce" },
  { id: 19, code: "PTTMP", name: "PTT Kargo" },
  { id: 17, code: "TEXMP", name: "Trendyol Express" },
  { id: 20, code: "CEVAMP", name: "CEVA" },
  { id: 30, code: "CEVATEDARIK", name: "Ceva Tedarik" },
  { id: 38, code: "SENDEOMP", name: "Kolay Gelsin" },
];
