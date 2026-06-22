"use client";

import Script from "next/script";
import type { GoogleSwgRuntimeConfig } from "@/lib/seo/google-swg-settings";

/** Subscribe with Google Basic — yalnızca blog listesi ve yazı sayfalarında */
export function GoogleSwgBasicScripts({ config }: { config: GoogleSwgRuntimeConfig }) {
  const init = `(self.SWG_BASIC=self.SWG_BASIC||[]).push(basicSubscriptions=>{basicSubscriptions.init({type:"NewsArticle",isPartOfType:["Product"],isPartOfProductId:${JSON.stringify(config.isPartOfProductId)},clientOptions:{theme:${JSON.stringify(config.theme)},lang:${JSON.stringify(config.lang)}}});});`;

  return (
    <>
      <Script src="https://news.google.com/swg/js/v1/swg-basic.js" strategy="afterInteractive" />
      <Script id="google-swg-basic-init" strategy="afterInteractive">
        {init}
      </Script>
    </>
  );
}
