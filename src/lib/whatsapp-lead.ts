import { randomBytes } from "crypto";

export const WA_LEAD_SOURCES = [
  "floating",
  "footer_cta",
  "product_page",
  "bot",
  "other",
] as const;

export type WaLeadSource = (typeof WA_LEAD_SOURCES)[number];

export const WA_LEAD_STATUS = ["new", "contacted", "closed"] as const;
export type WaLeadStatus = (typeof WA_LEAD_STATUS)[number];

export const WA_LEAD_SOURCE_LABELS: Record<WaLeadSource, string> = {
  floating: "Sabit WhatsApp balonu",
  footer_cta: "Alt bilgi / menü",
  product_page: "Ürün sayfası",
  bot: "Site botu",
  other: "Diğer",
};

export const WA_LEAD_STATUS_LABELS: Record<WaLeadStatus, string> = {
  new: "Yeni",
  contacted: "Yanıtlandı",
  closed: "Kapalı",
};

export function generateWhatsAppRef(): string {
  return randomBytes(4).toString("hex");
}

export function normalizeWaLeadSource(raw: string | undefined | null): WaLeadSource {
  const s = raw?.trim().toLowerCase();
  if (s && (WA_LEAD_SOURCES as readonly string[]).includes(s)) return s as WaLeadSource;
  return "other";
}

export function normalizeWaLeadStatus(raw: string | undefined | null): WaLeadStatus | null {
  const s = raw?.trim().toLowerCase();
  if (s && (WA_LEAD_STATUS as readonly string[]).includes(s)) return s as WaLeadStatus;
  return null;
}

export function buildWhatsAppLeadMessage(
  baseMessage: string | null | undefined,
  ref: string,
  botPath?: string | null,
): string {
  const base = baseMessage?.trim() || "Merhaba, mağazanızdan ulaşıyorum.";
  const path = botPath?.trim();
  const parts = [base];
  if (path) parts.push(`Konu: ${path}`);
  parts.push(`Ref: ${ref}`);
  return parts.join("\n\n");
}

export function buildWaMeUrl(phoneDigits: string, text: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}

export function mergePrefilledMessage(
  blockOrOverride: string | null | undefined,
  siteDefault: string | null | undefined,
): string {
  const custom = blockOrOverride?.trim();
  if (custom) return custom;
  const site = siteDefault?.trim();
  if (site) return site;
  return "Merhaba, mağazanızdan ulaşıyorum.";
}
