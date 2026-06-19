const PROVIDER_LABELS: Record<string, string> = {
  HEPSIJET: "Hepsijet",
  MNG: "MNG Kargo",
  SURAT: "Sürat Kargo",
  YURTICI: "Yurtiçi Kargo",
  PTT: "PTT Kargo",
  ARAS: "Aras Kargo",
  KOLAYGELSIN: "Kolay Gelsin",
  SENDEO: "Sendeo",
  UPS: "UPS",
  DHL: "DHL",
  FEDEX: "FedEx",
  TEX: "Trendyol Express",
  HOROZ: "Horoz Lojistik",
  CEVA: "CEVA",
};

export function formatGeliverProviderLabel(
  providerCode?: string | null,
  providerAccountName?: string | null,
): string {
  const account = providerAccountName?.trim();
  if (account) return account;
  const code = providerCode?.trim().toUpperCase();
  if (!code) return "Kargo";
  return PROVIDER_LABELS[code] ?? titleCaseProviderCode(code);
}

function titleCaseProviderCode(code: string): string {
  const lower = code.toLowerCase().replace(/_/g, " ");
  return lower.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function geliverCarrierCodeForQuote(providerServiceCode: string): string {
  return `geliver:${providerServiceCode.trim().toLowerCase()}`;
}

export const LEGACY_GELIVER_CARRIER_CODE = "geliver";
