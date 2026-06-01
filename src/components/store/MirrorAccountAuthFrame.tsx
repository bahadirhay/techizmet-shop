import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import type { MirrorAccountAuthMode } from "@/lib/mirror-account-auth-page";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function authMirrorRel(locale: "tr" | "en", mode: MirrorAccountAuthMode) {
  const base =
    mode === "login" ? "login" : mode === "register" ? "register" : "forgot-password";
  return locale === "tr"
    ? `theme/techizmet-shop/mirror/account/${base}-tr.html`
    : `theme/techizmet-shop/mirror/account/${base}.html`;
}

export async function MirrorAccountAuthFrame({ mode }: { mode: MirrorAccountAuthMode }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);

  const q = new URLSearchParams({ path: authMirrorRel(locale, mode) });
  const src = `/api/vitrin/mirror?${q.toString()}`;

  const title =
    mode === "login"
      ? locale === "tr"
        ? "Giriş yap"
        : "Log in"
      : mode === "register"
        ? locale === "tr"
          ? "Hesap oluştur"
          : "Create account"
        : locale === "tr"
          ? "Şifremi unuttum"
          : "Forgot password";

  return (
    <MirrorVitrinFrameClient
      src={src}
      title={title}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
