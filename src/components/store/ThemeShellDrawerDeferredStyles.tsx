"use client";

/** Çekmece CSS — LCP'yi bloklamadan yükle */
export function ThemeShellDrawerDeferredStyles({ hrefs }: { hrefs: string[] }) {
  return (
    <>
      {hrefs.map((href) => (
        <link
          key={href}
          rel="stylesheet"
          href={href}
          media="print"
          onLoad={(e) => {
            e.currentTarget.media = "all";
          }}
        />
      ))}
    </>
  );
}
