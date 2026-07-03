"use client";

import { CartProvider } from "@/components/cart/CartContext";
import { MiniCart } from "@/components/cart/MiniCart";
import { StreetFoodFundBar } from "@/components/store/StreetFoodFundBar";
import { StoreHeader } from "@/components/store/StoreHeader";
import { AccountProvider } from "@/components/store/account/AccountContext";
import { AccountDrawer } from "@/components/store/account/AccountDrawer";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";

export function StoreShell({
  siteName,
  logoSrc,
  locale,
  messages,
  nav,
  children,
}: {
  siteName: string;
  logoSrc?: string;
  locale: ShopLocale;
  messages: StoreMessages;
  nav: ResolvedNavItem[];
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <AccountProvider>
        <StreetFoodFundBar />
        <StoreHeader siteName={siteName} logoSrc={logoSrc} locale={locale} messages={messages} nav={nav} />
        <MiniCart />
        <AccountDrawer locale={locale} />
        {children}
      </AccountProvider>
    </CartProvider>
  );
}
