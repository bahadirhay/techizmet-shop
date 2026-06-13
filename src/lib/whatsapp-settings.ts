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
};

export type ResolvedWhatsAppConfig = {
  digits: string;
  number: string | null;
  defaultMessage: string | null;
  botEnabled: boolean;
  botTitle: string | null;
  botWelcome: string | null;
  floatingEnabled: boolean;
};

function fallbackPhone(settings: SiteSettings): string | null {
  return (
    settings.store?.legal?.phone?.trim() ||
    settings.store?.shipFrom?.phone?.trim() ||
    null
  );
}

export function getWhatsAppConfig(settings: SiteSettings): ResolvedWhatsAppConfig {
  const w = settings.whatsapp ?? {};
  const number = w.number?.trim() || fallbackPhone(settings) || null;
  const digits = resolveWaDigits(number);
  return {
    digits,
    number,
    defaultMessage: w.defaultMessage?.trim() || null,
    botEnabled: !!w.botEnabled && !!digits,
    botTitle: w.botTitle?.trim() || null,
    botWelcome: w.botWelcome?.trim() || null,
    floatingEnabled: w.floatingEnabled !== false && !!digits,
  };
}
