import Link from "next/link";
import { Suspense } from "react";
import { CartTrigger } from "@/components/cart/MiniCart";
import { LocaleSwitcher } from "@/components/store/LocaleSwitcher";
import { StoreHeaderNav } from "@/components/store/StoreHeaderNav";
import { StoreSearchForm } from "@/components/store/StoreSearchForm";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";

export function StoreHeader({
  siteName,
  logoSrc,
  locale,
  messages,
  nav,
}: {
  siteName: string;
  logoSrc?: string;
  locale: ShopLocale;
  messages: StoreMessages;
  nav: ResolvedNavItem[];
}) {

  return (
    <header className="kn-header kn-header--mirror">
      <div className="kn-header__inner">
        <Link href="/" className="kn-header__logo">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={siteName} width={90} height={43} />
          ) : (
            siteName
          )}
        </Link>
        <StoreHeaderNav items={nav} />
        <div className="kn-header__actions">
          <LocaleSwitcher
            locale={locale}
            label={messages.locale.label}
            trLabel={messages.locale.tr}
            enLabel={messages.locale.en}
          />
          <Suspense fallback={null}>
            <StoreSearchForm className="kn-search-form kn-search-form--header" />
          </Suspense>
          <CartTrigger />
          <Link href="/orders/track">{messages.nav.trackOrder}</Link>
          <Link href="/account">{messages.nav.account}</Link>
          <Link href="/cart" className="kn-header__cart-link">
            {messages.nav.cart}
          </Link>
        </div>
      </div>
    </header>
  );
}
