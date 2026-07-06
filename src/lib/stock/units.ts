/** Stok birimleri — kg gram bazında, adet parça bazında saklanır */

export type StockUnit = "kg" | "adet" | "gram";
export type StockItemKind = "raw_material" | "packaging" | "finished";

export function normalizeStockDescription(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function invoiceQtyToBase(qty: number, invoiceUnit: string, stockUnit: StockUnit): number {
  const u = invoiceUnit.trim().toLowerCase();
  const q = Math.max(0, qty);
  if (stockUnit === "adet") {
    if (u === "kg" || u === "kilogram") throw new Error("Adet stok kartına kg birimiyle giriş yapılamaz.");
    return Math.round(q);
  }
  // stockUnit kg → gram sakla
  if (u === "gram" || u === "gr" || u === "g") return Math.round(q);
  if (u === "kg" || u === "kilogram" || u === "kilo") return Math.round(q * 1000);
  // adet veya bilinmeyen — kg kartında adet girilmişse hata
  if (u === "adet" || u === "pcs" || u === "piece") {
    throw new Error("Kg stok kartına adet birimiyle giriş yapılamaz.");
  }
  return Math.round(q * 1000);
}

export function formatStockBalance(balanceBase: number, unit: StockUnit): string {
  if (unit === "adet") return `${balanceBase.toLocaleString("tr-TR")} adet`;
  const kg = balanceBase / 1000;
  return `${kg.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg`;
}

export function parseInvoiceUnit(raw: string | undefined | null): string {
  const u = (raw ?? "adet").trim().toLowerCase();
  if (u === "kilogram" || u === "kilo") return "kg";
  if (u === "gr" || u === "g") return "gram";
  return u || "adet";
}

export function formatLedgerQty(qtyBase: number, unit: StockUnit): string {
  const sign = qtyBase > 0 ? "+" : "";
  if (unit === "adet") return `${sign}${qtyBase} adet`;
  const kg = qtyBase / 1000;
  return `${sign}${kg.toLocaleString("tr-TR", { maximumFractionDigits: 3 })} kg`;
}
