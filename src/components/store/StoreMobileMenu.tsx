"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/store/account/AccountContext";
import { LocaleSwitcher } from "@/components/store/LocaleSwitcher";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";

/** Mobil hamburger + yandan açılan menü çekmecesi (mirror ≤1024px davranışı) */
export function StoreMobileMenu({
  nav,
  locale,
  messages,
}: {
  nav: ResolvedNavItem[];
  locale: ShopLocale;
  messages: StoreMessages;
}) {
  const [open, setOpen] = useState(false);
  const { openAccount } = useAccount();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="mobile-toggler hamburger--toggler"
        aria-label="Menü"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <div className="hamburger--toggler-icon">
          <span className="line line-1" />
          <span className="line line-2" />
          <span className="line line-3" />
        </div>
      </button>

      {open ? (
        <>
          <button type="button" className="kn-mobile-menu__overlay" aria-label="Kapat" onClick={close} />
          <aside className="kn-mobile-menu" role="dialog" aria-label="Menü">
            <div className="kn-mobile-menu__head">
              <LocaleSwitcher
                locale={locale}
                label={messages.locale.label}
                trLabel={messages.locale.tr}
                enLabel={messages.locale.en}
              />
              <button type="button" className="kn-mobile-menu__close" onClick={close} aria-label="Kapat">
                ×
              </button>
            </div>
            <nav className="kn-mobile-menu__nav" aria-label="Mobil menü">
              <ul>
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="kn-mobile-menu__link heading-font"
                      onClick={close}
                    >
                      {item.label}
                    </Link>
                    {item.columns?.length ? (
                      <ul className="kn-mobile-menu__sub">
                        {item.columns.flatMap((col) =>
                          col.links.map((l) => (
                            <li key={l.href}>
                              <Link href={l.href} onClick={close}>
                                {l.label}
                              </Link>
                            </li>
                          )),
                        )}
                      </ul>
                    ) : item.children?.length ? (
                      <ul className="kn-mobile-menu__sub">
                        {item.children.map((l) => (
                          <li key={l.href}>
                            <Link href={l.href} onClick={close}>
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="kn-mobile-menu__foot">
              <button
                type="button"
                className="kn-btn kn-btn--outline kn-btn--block"
                onClick={() => {
                  close();
                  openAccount("login");
                }}
              >
                {messages.nav.account}
              </button>
              <Link href="/orders/track" className="kn-mobile-menu__foot-link" onClick={close}>
                {messages.nav.trackOrder}
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
