import Link from "next/link";
import { StoreHeaderIcons } from "@/components/store/StoreHeaderIcons";
import { StoreHeaderNav } from "@/components/store/StoreHeaderNav";
import { StoreMobileMenu } from "@/components/store/StoreMobileMenu";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";

/** Mirror header birebir — header38c6.css + base2ff2.css (StoreThemeStyles ile global yüklü) */
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
    <header className="section-header kn-theme-shell-header">
      <div className="header style-logo-left-menu-left header-height-large sticky-always border-true shadow-true">
        <div className="container-fullwidth">
          <div className="header--wrapper logo-left-menu-left">
            <StoreMobileMenu nav={nav} locale={locale} messages={messages} />

            <Link className="header--logo" href="/" aria-label={siteName}>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="header--logo-img" src={logoSrc} alt={siteName} width={90} height={43} />
              ) : (
                <span className="header--logo-text">{siteName}</span>
              )}
            </Link>

            <StoreHeaderNav items={nav} />

            <div className="header--right" data-header-right>
              <StoreHeaderIcons locale={locale} messages={messages} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
