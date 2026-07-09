"use client";

import { CartProvider } from "@/components/cart/CartContext";
import { MiniCart } from "@/components/cart/MiniCart";
import { StreetFoodFundBar } from "@/components/store/StreetFoodFundBar";
import { StoreHeader } from "@/components/store/StoreHeader";
import { ThemeShellMirrorDrawers } from "@/components/store/ThemeShellMirrorDrawers";
import { AccountProvider } from "@/components/store/account/AccountContext";
import { AccountDrawer } from "@/components/store/account/AccountDrawer";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";
import type { ThemeShellDrawers } from "@/lib/theme-shell-drawers";

export function StoreShell({
  siteName,
  logoSrc,
  locale,
  messages,
  nav,
  mirrorDrawers,
  children,
}: {
  siteName: string;
  logoSrc?: string;
  locale: ShopLocale;
  messages: StoreMessages;
  nav: ResolvedNavItem[];
  mirrorDrawers?: ThemeShellDrawers;
  children: React.ReactNode;
}) {
  const useMirrorDrawers = Boolean(mirrorDrawers?.html && mirrorDrawers.storeBridgeJs);

  return (
    <CartProvider exposeWindowBridge={!useMirrorDrawers}>
      <AccountProvider>
        <StreetFoodFundBar />
        <StoreHeader
          siteName={siteName}
          logoSrc={logoSrc}
          locale={locale}
          messages={messages}
          nav={nav}
          mirrorDrawers={useMirrorDrawers}
        />
        {useMirrorDrawers && mirrorDrawers ? (
          <ThemeShellMirrorDrawers
            html={mirrorDrawers.html}
            stylesheets={mirrorDrawers.stylesheets}
            storeBridgeJs={mirrorDrawers.storeBridgeJs}
          />
        ) : (
          <>
            <MiniCart />
            <AccountDrawer locale={locale} />
          </>
        )}
        {children}
      </AccountProvider>
    </CartProvider>
  );
}
