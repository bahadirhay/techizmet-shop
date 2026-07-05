"use client";

import { useLayoutEffect } from "react";
import { applyMirrorHeaderIconsFix } from "@/lib/mirror-header-overlay";

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
    applyMirrorHeaderIconsFix(document);
    syncThemeShellHeaderMetrics();

    const onResize = () => {
      applyMirrorHeaderIconsFix(document);
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
