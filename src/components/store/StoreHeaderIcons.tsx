"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useAccount } from "@/components/store/account/AccountContext";
import { LocaleSwitcher } from "@/components/store/LocaleSwitcher";
import { ThemeShellSearchDrawer } from "@/components/store/ThemeShellSearchDrawer";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";

const SearchIcon = () => (
  <svg width="18" height="19" viewBox="0 0 18 19" fill="none" aria-hidden="true">
    <path
      d="M7.96875 15.6875C11.9556 15.6875 15.1875 12.4556 15.1875 8.4688C15.1875 4.48194 11.9556 1.25 7.96875 1.25C3.98194 1.25 0.75 4.48194 0.75 8.4688C0.75 12.4556 3.98194 15.6875 7.96875 15.6875Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.0732 13.5742L17.2497 17.7508"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AccountIcon = () => (
  <svg width="17" height="18" viewBox="0 0 17 18" fill="none" aria-hidden="true">
    <path
      d="M8.5 9.15625C10.7954 9.15625 12.6563 7.29543 12.6563 5C12.6563 2.70457 10.7954 0.84375 8.5 0.84375C6.20457 0.84375 4.34375 2.70457 4.34375 5C4.34375 7.29543 6.20457 9.15625 8.5 9.15625Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M15.5 16.375C15.5 12.509 12.366 9.375 8.5 9.375C4.634 9.375 1.5 12.509 1.5 16.375"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CartIcon = () => (
  <svg width="17" height="19" viewBox="0 0 17 19" fill="none" className="cart--icon" aria-hidden="true">
    <path
      d="M13.8624 5.125H3.13686C2.21555 5.125 1.45202 5.83932 1.39074 6.75859L0.749072 16.3836C0.681732 17.3936 1.48288 18.25 2.49519 18.25H14.5041C15.5164 18.25 16.3176 17.3936 16.2502 16.3836L15.6086 6.75859C15.5472 5.83932 14.7837 5.125 13.8624 5.125Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 7.75V4.25C12 2.317 10.433 0.75 8.5 0.75C6.567 0.75 5 2.317 5 4.25V7.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
    />
  </svg>
);

/** Mirror header sağ ikonları — canlı vitrin çekmeceleri veya React fallback */
export function StoreHeaderIcons({
  locale,
  messages,
  mirrorDrawers = false,
}: {
  locale: ShopLocale;
  messages: StoreMessages;
  mirrorDrawers?: boolean;
}) {
  const { cart, openCart } = useCart();
  const { openAccount } = useAccount();
  const [searchOpen, setSearchOpen] = useState(false);
  const count = cart?.itemCount ?? 0;

  if (mirrorDrawers) {
    return (
      <div className="header--icons height-100">
        <ul className="d-flex header--icons-list height-100">
          <li className="header--icon-item kn-locale-icon-item">
            <LocaleSwitcher
              locale={locale}
              label={messages.locale.label}
              trLabel={messages.locale.tr}
              enLabel={messages.locale.en}
              compact
            />
          </li>
          <li className="header--icon-item search">
            <div className="header--icon-link" data-behaviour="drawer" data-source="search-drawer">
              <a
                href="#"
                className="header--icon-link-text cursor-pointer"
                title={messages.nav.search}
                aria-label={messages.nav.search}
                onClick={(e) => e.preventDefault()}
              >
                <SearchIcon />
              </a>
            </div>
          </li>
          <li className="header--icon-item account">
            <div className="header--icon-link" data-behaviour="drawer" data-source="account-drawer">
              <a
                href="/account"
                className="header--icon-link-text cursor-pointer"
                title={messages.nav.account}
                aria-label={messages.nav.account}
                onClick={(e) => e.preventDefault()}
              >
                <AccountIcon />
              </a>
            </div>
          </li>
          <li className="header--icon-item cart">
            <div
              className="header--icon-link"
              data-behaviour="drawer"
              id="cart-count-icon"
              data-source="cart-drawer"
            >
              <a
                href="/cart"
                className="header--icon-link-text cursor-pointer"
                aria-label={`${messages.nav.cart} (${count})`}
                onClick={(e) => e.preventDefault()}
              >
                <CartIcon />
                <span className={`cart--count${count > 0 ? "" : " hidden"}`} data-cart-count>
                  {count}
                </span>
              </a>
            </div>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="header--icons height-100">
      <ul className="d-flex header--icons-list height-100">
        <li className="header--icon-item kn-locale-icon-item">
          <LocaleSwitcher
            locale={locale}
            label={messages.locale.label}
            trLabel={messages.locale.tr}
            enLabel={messages.locale.en}
            compact
          />
        </li>

        <li className="header--icon-item search">
          <button
            type="button"
            className="header--icon-link-text cursor-pointer"
            title={messages.nav.search}
            aria-label={messages.nav.search}
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon />
          </button>
        </li>

        <li className="header--icon-item account">
          <button
            type="button"
            className="header--icon-link-text cursor-pointer"
            title={messages.nav.account}
            aria-label={messages.nav.account}
            onClick={() => openAccount("login")}
          >
            <AccountIcon />
          </button>
        </li>

        <li className="header--icon-item cart">
          <button
            type="button"
            className="header--icon-link-text cursor-pointer"
            aria-label={`${messages.nav.cart} (${count})`}
            onClick={openCart}
          >
            <CartIcon />
            <span className={`cart--count${count > 0 ? "" : " hidden"}`} data-cart-count>
              {count}
            </span>
          </button>
        </li>
      </ul>

      <ThemeShellSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} locale={locale} />
    </div>
  );
}
