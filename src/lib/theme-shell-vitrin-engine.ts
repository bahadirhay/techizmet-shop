import type { ThemeShellProductScript } from "@/lib/theme-shell-product-content";
import { getMirrorSwiperRuntimeInlineScript } from "@/lib/mirror-html-swiper-patch";

const THEME_ASSET = "/theme/techizmet-shop/cdn/shop/t/5/assets";

/** Vitrin carousel / swiper-content — mirror iframe ile aynı motor zinciri */
const THEME_SHELL_VITRIN_ENGINE_EXTERNALS: ThemeShellProductScript[] = [
  {
    kind: "external",
    src: `${THEME_ASSET}/swiper-bundle.minaf14.js?v=3451582574531682021750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/cookies.min6361.js?v=88425056791309038751750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/lazyload.min75f1.js?v=75832270841366028481750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/gsap.mind5fb.js?v=98399229928229536421750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/ScrollTrigger.min637c.js?v=51844696078135174451750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/SplitText.minaada.js?v=67687280780119264421750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/pubsubc068.js?v=158357773527763999511750848849`,
  },
  {
    kind: "external",
    src: `${THEME_ASSET}/themeeef6.js?v=52922621324768966531752046226`,
  },
  {
    kind: "external",
    src: "/theme/techizmet-shop/mirror-embed-boot.js",
  },
];

function scriptKey(script: ThemeShellProductScript): string {
  if (script.kind === "external") return `e:${script.src}`;
  if (script.code.includes("Swiper.__knW")) return "kn-swiper-runtime";
  if (script.code.includes("window.theme")) return "kn-theme-window-config";
  return `i:${script.code.length}:${script.code.slice(0, 80)}`;
}

function hasExternal(scripts: ThemeShellProductScript[], marker: string): boolean {
  return scripts.some((s) => s.kind === "external" && s.src.includes(marker));
}

/** themeeef6 + swiper runtime — HTML strip sonrası eksik kalan vitrin motoru */
export function mergeThemeShellVitrinEngineScripts(
  scripts: ThemeShellProductScript[],
): ThemeShellProductScript[] {
  const out: ThemeShellProductScript[] = [];
  const seen = new Set<string>();

  const add = (script: ThemeShellProductScript) => {
    const key = scriptKey(script);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(script);
  };

  for (const script of scripts) {
    if (script.kind === "external" && script.src.includes("mirror-embed-boot")) continue;
    add(script);
    if (script.kind === "external" && script.src.includes("swiper-bundle")) {
      add({ kind: "inline", code: getMirrorSwiperRuntimeInlineScript() });
    }
  }

  for (const script of THEME_SHELL_VITRIN_ENGINE_EXTERNALS) {
    const marker =
      script.kind === "external"
        ? script.src.includes("mirror-embed-boot")
          ? "mirror-embed-boot"
          : script.src.split("/").pop()?.split("?")[0]?.replace(".js", "") ?? ""
        : "";
    if (script.kind === "external" && marker && hasExternal(out, marker)) continue;
    add(script);
    if (script.kind === "external" && script.src.includes("swiper-bundle")) {
      add({ kind: "inline", code: getMirrorSwiperRuntimeInlineScript() });
    }
  }

  return out;
}
