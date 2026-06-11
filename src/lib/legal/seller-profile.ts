import { getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";

export type LegalSellerProfile = {
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  mersisNo: string;
  taxOffice: string;
  taxNo: string;
  website: string;
  caymaEmail: string;
  arbitrationInfo: string;
};

export type StoreLegalSettings = NonNullable<NonNullable<SiteSettings["store"]>["legal"]>;

type ShipFromFields = NonNullable<NonNullable<SiteSettings["store"]>["shipFrom"]>;

function formatShipFromAddress(shipFrom?: ShipFromFields): string {
  if (!shipFrom) return "";
  return [shipFrom.line1, shipFrom.line2, shipFrom.district, shipFrom.city, shipFrom.postalCode]
    .filter(Boolean)
    .join(", ");
}

function websiteLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return host ? `www.${host}` : url;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

/** Admin + e-fatura + kargo gönderici bilgilerinden satıcı profili */
export function resolveLegalSellerProfile(
  settings: SiteSettings,
  site?: { name?: string },
): LegalSellerProfile {
  const legal = settings.store?.legal ?? {};
  const shipFrom = settings.store?.shipFrom ?? {};
  const efatura = settings.efatura ?? {};
  const emailFrom = settings.notifications?.email?.fromEmail?.trim();

  const storeUrl = legal.website?.trim() || getPublicSiteUrl();
  const taxOffice = legal.taxOffice?.trim() || efatura.sellerTaxOffice?.trim() || "";
  const taxNo = legal.taxNo?.trim() || efatura.sellerTaxId?.trim() || "";

  return {
    tradeName:
      legal.tradeName?.trim() ||
      efatura.sellerTitle?.trim() ||
      shipFrom.name?.trim() ||
      site?.name?.trim() ||
      "Satıcı",
    address: legal.address?.trim() || formatShipFromAddress(shipFrom),
    phone: legal.phone?.trim() || shipFrom.phone?.trim() || "",
    email: legal.email?.trim() || emailFrom || "",
    mersisNo: legal.mersisNo?.trim() || "",
    taxOffice,
    taxNo,
    website: websiteLabel(storeUrl),
    caymaEmail: legal.caymaEmail?.trim() || legal.email?.trim() || emailFrom || "",
    arbitrationInfo:
      legal.arbitrationInfo?.trim() ||
      "İl/ilçe Tüketici Hakem Heyeti ve Tüketici Mahkemeleri",
  };
}
