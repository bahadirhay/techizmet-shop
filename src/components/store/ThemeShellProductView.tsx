import { MIRROR_LISTING_CART_BRIDGE_JS } from "@/lib/mirror-listing-cart-bridge";
import { MIRROR_PRODUCT_FAVORITES_STYLE } from "@/lib/mirror-product-favorites-bridge";
import {
  MIRROR_PRODUCT_BREADCRUMB_STYLE,
  type MirrorBreadcrumbItem,
} from "@/lib/mirror-product-breadcrumb";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { ThemeShellProductContent } from "@/lib/theme-shell-product-content";
import { PRODUCT_MEDIA_ZOOM_FIX_CSS } from "@/lib/product-media-zoom-fix";
import { ThemeShellProductBoot } from "@/components/store/ThemeShellProductBoot";
import { ThemeShellProductScripts } from "@/components/store/ThemeShellProductScripts";

function ThemeShellProductBreadcrumb({
  items,
  locale,
}: {
  items: MirrorBreadcrumbItem[];
  locale: ShopLocale;
}) {
  if (!items.length) return null;
  return (
    <nav
      id="kn-mirror-breadcrumb"
      className="kn-mirror-breadcrumb"
      aria-label={locale === "tr" ? "Konum" : "Breadcrumb"}
    >
      <ol>
        {items.map((item) => (
          <li key={item.href + item.name} aria-current={item.current ? "page" : undefined}>
            {item.current ? (
              item.name
            ) : (
              <a href={item.href}>{item.name}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Ürün PDP — iframe'siz. Mirror MainContent + Shopify tema motoru scriptleri
 * (gsap, swiper, themeeef6, zoom) istemci tarafında sırayla yüklenir.
 */
export function ThemeShellProductView({
  content,
  breadcrumbs,
  locale = "tr",
}: {
  content: ThemeShellProductContent;
  breadcrumbs: MirrorBreadcrumbItem[];
  locale?: ShopLocale;
}) {
  const listingBridgeScript: ThemeShellProductContent["scripts"][number] = {
    kind: "inline",
    code: MIRROR_LISTING_CART_BRIDGE_JS,
  };

  return (
    <div className="kn-theme-shell-product">
      <ThemeShellProductBoot />
      <style
        id="kn-product-media-zoom-fix-style"
        dangerouslySetInnerHTML={{ __html: PRODUCT_MEDIA_ZOOM_FIX_CSS }}
      />
      <style dangerouslySetInnerHTML={{ __html: MIRROR_PRODUCT_BREADCRUMB_STYLE }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `.kn-theme-shell-product-active .kn-theme-shell-header .header{background:#fff!important;color:#111!important;}.kn-theme-shell-product-active .kn-theme-shell-header .header--menu-link,.kn-theme-shell-product-active .kn-theme-shell-header .header--logo-text{color:#111!important;}`,
        }}
      />
      {content.headStyles.map((css, i) => (
        <style key={`head-style-${i}`} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: MIRROR_PRODUCT_FAVORITES_STYLE }} />
      {content.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <ThemeShellProductBreadcrumb items={breadcrumbs} locale={locale} />
      <div className="kn-theme-shell-sections kn-theme-shell-product__main">
        <main
          id="MainContent"
          className="content-for-layout focus-none"
          dangerouslySetInnerHTML={{ __html: content.mainHtml }}
        />
      </div>
      <ThemeShellProductScripts scripts={[...content.scripts, listingBridgeScript]} />
    </div>
  );
}
