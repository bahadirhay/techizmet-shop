const BASE = "/theme/techizmet-shop/cdn/shop/t/5/assets";
const V = "?v=1";

/** Mirror sayfa bölümleri — page-banner + richtext (iframe kabuğu yok) */
const SECTION_SHEETS = [
  `${BASE}/richtext5169.css${V}`,
  `${BASE}/componentcd23.css${V}`,
  "/theme/techizmet-shop/kn-blog-cards.css?v=3",
];

export function ThemeShellSectionStyles() {
  return (
    <>
      {SECTION_SHEETS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  );
}
