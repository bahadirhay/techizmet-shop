"use client";

/** Ana sayfa — LCP dışı bölüm CSS'ini render'ı bloklamadan yükle */
const CRITICAL_HREF = /media-grid|featured-collection|kn-mirror-hero/i;

export function ThemeShellDeferredStyles({ hrefs }: { hrefs: string[] }) {
  return (
    <>
      {hrefs.map((href) => {
        if (CRITICAL_HREF.test(href)) {
          return <link key={href} rel="stylesheet" href={href} />;
        }
        return (
          <link
            key={href}
            rel="stylesheet"
            href={href}
            media="print"
            onLoad={(e) => {
              e.currentTarget.media = "all";
            }}
          />
        );
      })}
    </>
  );
}
