"use client";

import { useLayoutEffect } from "react";

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

/** iframe ile aynı html sınıfları — galeri sync guard + zoom CSS + header ölçümü */
export function ThemeShellProductBoot() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-kn-product-sync", "1");
    root.classList.add("js", "kn-mirror-embed", "kn-theme-shell-product-active");
    document.getElementById("kn-product-sync-guard")?.remove();
    syncThemeShellHeaderMetrics();

    const onResize = () => syncThemeShellHeaderMetrics();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return null;
}
