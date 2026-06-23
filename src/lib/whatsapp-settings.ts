import type { SiteSettings } from "@/lib/site-settings";
import { resolveWaDigits } from "@/lib/whatsapp-url";

export type StoreWhatsAppSettings = {
  number?: string;
  defaultMessage?: string;
  botEnabled?: boolean;
  botTitle?: string;
  botWelcome?: string;
  /** Sol alt sabit balon (varsayılan: true, numara varsa) */
  floatingEnabled?: boolean;
  /** Ürün önerisi formunda gösterilecek türler (varsayılan: yalnızca köpek) */
  recommendPetTypes?: ("dog" | "cat")[];
};

export type RecommendPetType = "dog" | "cat";

export type ResolvedWhatsAppConfig = {
  digits: string;
  number: string | null;
  defaultMessage: string | null;
  botEnabled: boolean;
  botTitle: string | null;
  botWelcome: string | null;
  floatingEnabled: boolean;
  recommendPetTypes: RecommendPetType[];
};

function normalizeTurkishMobile(digits: string): string {
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `9${digits}`;
  return digits;
}

function fallbackPhone(settings: SiteSettings): string | null {
  return (
    settings.store?.legal?.phone?.trim() ||
    settings.store?.shipFrom?.phone?.trim() ||
    null
  );
}

function resolveRecommendPetTypes(w: StoreWhatsAppSettings): RecommendPetType[] {
  const raw = w.recommendPetTypes;
  if (!raw?.length) return ["dog"];
  const types = raw.filter((t): t is RecommendPetType => t === "dog" || t === "cat");
  return types.length ? types : ["dog"];
}

export function getWhatsAppConfig(settings: SiteSettings): ResolvedWhatsAppConfig {
  const w = settings.whatsapp ?? {};
  const rawNumber = w.number?.trim() || fallbackPhone(settings) || null;
  const digits = rawNumber ? normalizeTurkishMobile(resolveWaDigits(rawNumber)) : "";
  return {
    digits,
    number: rawNumber,
    defaultMessage: w.defaultMessage?.trim() || null,
    botEnabled: !!w.botEnabled && !!digits,
    botTitle: w.botTitle?.trim() || null,
    botWelcome: w.botWelcome?.trim() || null,
    floatingEnabled: w.floatingEnabled !== false && !!digits,
    recommendPetTypes: resolveRecommendPetTypes(w),
  };
}
