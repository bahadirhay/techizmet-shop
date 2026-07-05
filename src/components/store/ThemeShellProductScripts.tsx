"use client";

import { useEffect, useMemo } from "react";
import type { ThemeShellProductScript } from "@/lib/theme-shell-product-content";
import { getThemeShellProductMediaZoomScript } from "@/lib/product-media-zoom-fix";
import { bootThemeShellVitrinFeatures } from "@/components/store/ThemeShellVitrinBoot";

/** React Strict Mode / HMR aynı inline script'i iki kez çalıştırmasın */
const executedInlineScriptKeys = new Set<string>();
let scriptBootSeq = 0;

function inlineScriptKey(code: string): string {
  const trimmed = code.trim();
  if (trimmed.includes("__knProductZoomVer")) return "kn-product-media-zoom-fix";
  if (trimmed.includes("const showFilters")) return "kn-theme-locale-strings";
  if (trimmed.includes("window.theme") && trimmed.includes("ON_CHANGE_DEBOUNCE_TIMER")) {
    return "kn-theme-window-config";
  }
  if (trimmed.includes("function boot") && trimmed.includes("main--product-image-slider-outer")) {
    return "kn-product-gallery-reinit";
  }
  return `${trimmed.length}:${trimmed.slice(0, 160)}:${trimmed.slice(-80)}`;
}

function loadExternalScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Script failed: ${src}`));
    document.body.appendChild(el);
  });
}

function runInlineScript(code: string): boolean {
  const key = inlineScriptKey(code);
  if (executedInlineScriptKeys.has(key)) return false;
  executedInlineScriptKeys.add(key);
  try {
    const el = document.createElement("script");
    el.textContent = code;
    document.body.appendChild(el);
    return true;
  } catch (err) {
    executedInlineScriptKeys.delete(key);
    console.warn("[theme-shell-product] inline script skipped", err);
    return false;
  }
}

function isZoomFixScript(script: ThemeShellProductScript): boolean {
  return script.kind === "inline" && script.code.includes("__knProductZoomVer");
}

function orderThemeShellScripts(scripts: ThemeShellProductScript[]): ThemeShellProductScript[] {
  const externals: ThemeShellProductScript[] = [];
  const inlines: ThemeShellProductScript[] = [];
  const zoomInlines: ThemeShellProductScript[] = [];

  for (const script of scripts) {
    if (script.kind === "external") {
      externals.push(script);
      continue;
    }
    if (isZoomFixScript(script)) {
      zoomInlines.push(script);
      continue;
    }
    inlines.push(script);
  }

  return [...externals, ...inlines, ...zoomInlines];
}

function rerunThemeShellGalleryBoot(): void {
  const SwiperCtor = (window as Window & { Swiper?: new (el: HTMLElement, cfg: object) => unknown })
    .Swiper;
  if (!SwiperCtor) return;
  document.querySelectorAll("[data-swiper]:not(.swiper-initialized)").forEach((el) => {
    try {
      const cfg = JSON.parse(el.getAttribute("data-swiper") || "{}");
      new SwiperCtor(el as HTMLElement, cfg);
    } catch {
      /* ignore */
    }
  });

  const outer = document.querySelector("#MainContent .main--product-image-slider-outer");
  const host = outer?.closest("swiper-content") as (HTMLElement & { _initial_run?: () => void }) | null;
  host?._initial_run?.();
}

function scheduleThemeShellGalleryBoot(): void {
  rerunThemeShellGalleryBoot();
  for (const ms of [120, 400, 1200, 3000]) {
    window.setTimeout(rerunThemeShellGalleryBoot, ms);
  }
}

/** Shopify tema motoru scriptlerini belge sırasında yükler (gsap → swiper → themeeef6 → zoom) */
export function ThemeShellProductScripts({ scripts }: { scripts: ThemeShellProductScript[] }) {
  const scriptsKey = useMemo(
    () =>
      scripts
        .map((s) => (s.kind === "external" ? `e:${s.src}` : `i:${inlineScriptKey(s.code)}`))
        .join("|"),
    [scripts],
  );

  useEffect(() => {
    const bootId = ++scriptBootSeq;
    let cancelled = false;
    const ordered = orderThemeShellScripts(scripts);

    (async () => {
      try {
        for (const s of ordered) {
          if (cancelled || bootId !== scriptBootSeq) return;
          if (isZoomFixScript(s)) continue;
          if (s.kind === "inline") {
            runInlineScript(s.code);
          } else {
            await loadExternalScript(s.src);
          }
        }
        if (cancelled || bootId !== scriptBootSeq) return;
        scheduleThemeShellGalleryBoot();
        bootThemeShellVitrinFeatures();
      } catch (err) {
        console.error("[theme-shell-product] theme script load failed", err);
      }

      if (cancelled || bootId !== scriptBootSeq) return;
      const w = window as Window & { __knProductZoomVer?: number };
      if (w.__knProductZoomVer !== 9) {
        runInlineScript(getThemeShellProductMediaZoomScript());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptsKey]);

  return null;
}
