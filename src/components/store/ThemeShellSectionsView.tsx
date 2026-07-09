import type { ThemeShellSectionsContent } from "@/lib/theme-shell-sections-content";
import { ThemeShellInjectedStyles } from "@/components/store/ThemeShellInjectedStyles";
import { ThemeShellListingCartBridge } from "@/components/store/ThemeShellListingCartBridge";
import { ThemeShellListingCartBridgeScript } from "@/components/store/ThemeShellListingCartBridgeScript";
import { ThemeShellProductScripts } from "@/components/store/ThemeShellProductScripts";
import { ThemeShellSectionStyles } from "@/components/store/ThemeShellSectionStyles";
import { ThemeShellVitrinBoot } from "@/components/store/ThemeShellVitrinBoot";
import { mergeThemeShellVitrinEngineScripts } from "@/lib/theme-shell-vitrin-engine";

/** Mirror MainContent bölümleri — iframe yok, admin overlay uygulanmış HTML */
export function ThemeShellSectionsView({
  content,
  withCartBridge = false,
  withVitrinBoot = false,
}: {
  content: ThemeShellSectionsContent;
  /** Ürün kartlı sayfalarda (koleksiyon) sepete ekle köprüsü */
  withCartBridge?: boolean;
  /** Swiper, ürün kartı hover, mama fonu bar — vitrin sayfaları */
  withVitrinBoot?: boolean;
}) {
  const bootVitrin = withCartBridge || withVitrinBoot;

  return (
    <>
      <ThemeShellInjectedStyles />
      <ThemeShellSectionStyles />
      {content.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div className="kn-theme-shell-sections">
        <main
          id="MainContent"
          className="content-for-layout focus-none"
          dangerouslySetInnerHTML={{ __html: content.mainHtml }}
        />
      </div>
      {withCartBridge ? (
        <>
          <ThemeShellListingCartBridgeScript />
          <ThemeShellListingCartBridge />
        </>
      ) : null}
      {bootVitrin ? <ThemeShellVitrinBoot /> : null}
      {bootVitrin ? (
        <ThemeShellProductScripts scripts={mergeThemeShellVitrinEngineScripts([])} />
      ) : null}
    </>
  );
}
