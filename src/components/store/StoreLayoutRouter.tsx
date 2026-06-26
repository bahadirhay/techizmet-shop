"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { CartProvider } from "@/components/cart/CartContext";
import { HtmlLang } from "@/components/store/HtmlLang";
import { MirrorIframeBootScript } from "@/components/store/MirrorIframeBootScript";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreShell } from "@/components/store/StoreShell";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";
import type { HomepageMode } from "@/lib/site-settings";
import type { SocialLink } from "@/lib/social-links";
import { isMirrorShellPath } from "@/lib/store-mirror-paths";

const StoreThemeStyles = dynamic(
  () => import("@/components/store/StoreThemeStyles").then((m) => ({ default: m.StoreThemeStyles })),
  { ssr: true },
);

/** Mirror / React shell ayrımı — client pathname ile (blog → vitrin geçişinde çift header önlenir) */
export function StoreLayoutRouter({
  homepageMode,
  locale,
  siteName,
  logoSrc,
  messages,
  nav,
  socialLinks,
  children,
}: {
  homepageMode: HomepageMode;
  locale: ShopLocale;
  siteName: string;
  logoSrc?: string;
  messages: StoreMessages;
  nav: { href: string; label: string }[];
  socialLinks?: SocialLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const mirrorShell = homepageMode === "mirror" && isMirrorShellPath(pathname);

  if (mirrorShell) {
    return (
      <>
        <HtmlLang locale={locale} />
        <MirrorIframeBootScript />
        <CartProvider>{children}</CartProvider>
      </>
    );
  }

  return (
    <>
      <HtmlLang locale={locale} />
      <StoreThemeStyles />
      <StoreShell siteName={siteName} logoSrc={logoSrc} locale={locale} messages={messages} nav={nav}>
        <main className="kn-main">{children}</main>
        <StoreFooter siteName={siteName} messages={messages.footer} socialLinks={socialLinks} />
      </StoreShell>
    </>
  );
}
