"use client";

import { useLayoutEffect } from "react";
import { HEADER_MOBILE_FIT_CSS, buildHeaderMobileFitScript } from "@/lib/mirror-header-mobile-fit";
import { applyMirrorHeaderIconsFix } from "@/lib/mirror-header-overlay";

const MOBILE_BP = 1024;
const HEADER_MOBILE_STYLE_ID = "kn-header-mobile-fit-style";

function syncMobileHeaderClass() {
  const root = document.documentElement;
  if (window.matchMedia(`(max-width:${MOBILE_BP}px)`).matches) {
    root.classList.add("kn-mobile-header");
  } else {
    root.classList.remove("kn-mobile-header");
  }
}

function syncThemeShellHeaderMetrics() {
  const header =
    document.querySelector<HTMLElement>(".kn-theme-shell-header") ??
    document.querySelector<HTMLElement>(".section-header");
  if (!header) return;
  const h = Math.max(Math.round(header.getBoundingClientRect().height), 56);
  document.body.style.setProperty("--header_height", `${h}px`);
  document.body.style.setProperty("--dynamic_header_height", `${h}px`);
  document.body.style.setProperty("--desktop_transparent_header_height", "0px");
}

/** Tema kabuğu header — mobil grid, ikonlar, TR/EN (mirror iframe ile aynı) */
export function ThemeShellHeaderBoot() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("js", "kn-mirror-embed", "kn-theme-shell-active");
    if (!document.getElementById(HEADER_MOBILE_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = HEADER_MOBILE_STYLE_ID;
      style.textContent = HEADER_MOBILE_FIT_CSS;
      document.head.appendChild(style);
    }
    if (!document.getElementById("kn-header-mobile-fit-script-v4")) {
      const script = document.createElement("script");
      script.id = "kn-header-mobile-fit-script-v4";
      script.textContent = buildHeaderMobileFitScript();
      document.body.appendChild(script);
    }
    applyMirrorHeaderIconsFix(document);
    syncMobileHeaderClass();
    syncThemeShellHeaderMetrics();

    const onResize = () => {
      applyMirrorHeaderIconsFix(document);
      syncMobileHeaderClass();
      syncThemeShellHeaderMetrics();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const t1 = window.setTimeout(onResize, 120);
    const t2 = window.setTimeout(onResize, 600);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
