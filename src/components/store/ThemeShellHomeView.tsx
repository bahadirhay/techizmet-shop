import type { ThemeShellHomeContent } from "@/lib/theme-shell-home-content";
import { StreetFoodFundHero } from "@/components/store/StreetFoodFundHero";
import { ThemeShellListingCartBridge } from "@/components/store/ThemeShellListingCartBridge";
import { ThemeShellProductScripts } from "@/components/store/ThemeShellProductScripts";
import { ThemeShellVitrinBoot } from "@/components/store/ThemeShellVitrinBoot";

const MIRROR_HERO_CSS = "/theme/techizmet-shop/kn-mirror-hero.css?v=2";

/** Ana sayfa vitrin bölümleri — ürün kartları, swiper, tema scriptleri */
export function ThemeShellHomeView({ content }: { content: ThemeShellHomeContent }) {
  return (
    <>
      {content.stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <link rel="stylesheet" href={MIRROR_HERO_CSS} />
      <div className="kn-theme-shell-sections kn-theme-shell-home">
        <main
          id="MainContent"
          className="content-for-layout focus-none"
          dangerouslySetInnerHTML={{ __html: content.mainHtml }}
        />
      </div>
      <StreetFoodFundHero />
      <ThemeShellListingCartBridge />
      <ThemeShellVitrinBoot />
      <ThemeShellProductScripts scripts={content.scripts} />
    </>
  );
}