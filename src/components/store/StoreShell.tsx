"use client";

import { CartProvider } from "@/components/cart/CartContext";
import { MiniCart } from "@/components/cart/MiniCart";
import { StoreHeader } from "@/components/store/StoreHeader";
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
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <StoreHeader siteName={siteName} logoSrc={logoSrc} locale={locale} messages={messages} nav={nav} />
      <MiniCart />
      {children}
    </CartProvider>
  );
}
