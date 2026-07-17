import "server-only";

import type { SiteSettings } from "@/lib/site-settings";
import {
  BOX_QR_SOURCE,
  DEFAULT_BOX_QR,
  type BoxQrCampaignSettings,
  type BoxQrPublicConfig,
} from "@/lib/box-qr/types";

export function getBoxQrSettings(settings: SiteSettings): Required<BoxQrCampaignSettings> {
  const raw = settings.boxQrCampaign ?? {};
  const percent = Number(raw.discountPercent ?? DEFAULT_BOX_QR.discountPercent);
  const days = Number(raw.validityDays ?? DEFAULT_BOX_QR.validityDays);
  const minCart = Number(raw.minCartTry ?? DEFAULT_BOX_QR.minCartTry);
  return {
    enabled: raw.enabled !== false,
    discountPercent: Number.isFinite(percent) ? Math.min(50, Math.max(1, Math.round(percent))) : 15,
    validityDays: Number.isFinite(days) ? Math.min(365, Math.max(1, Math.round(days))) : 30,
    firstOrderOnly: raw.firstOrderOnly !== false,
    minCartTry: Number.isFinite(minCart) && minCart > 0 ? minCart : 0,
    headlineTr: raw.headlineTr?.trim() || DEFAULT_BOX_QR.headlineTr,
    subheadTr: raw.subheadTr?.trim() || DEFAULT_BOX_QR.subheadTr,
    bodyTr: raw.bodyTr?.trim() || DEFAULT_BOX_QR.bodyTr,
    ctaTr: raw.ctaTr?.trim() || DEFAULT_BOX_QR.ctaTr,
    successTr: raw.successTr?.trim() || DEFAULT_BOX_QR.successTr,
    legalTr: raw.legalTr?.trim() || DEFAULT_BOX_QR.legalTr,
  };
}

export function toBoxQrPublicConfig(settings: SiteSettings): BoxQrPublicConfig {
  const s = getBoxQrSettings(settings);
  return {
    enabled: s.enabled,
    discountPercent: s.discountPercent,
    validityDays: s.validityDays,
    firstOrderOnly: s.firstOrderOnly,
    minCartTry: s.minCartTry,
    headline: s.headlineTr,
    subhead: s.subheadTr,
    body: s.bodyTr,
    cta: s.ctaTr.replace(/%\d+/g, `%${s.discountPercent}`),
    success: s.successTr,
    legal: s.legalTr,
  };
}

export { BOX_QR_SOURCE, DEFAULT_BOX_QR };
