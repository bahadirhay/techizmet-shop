import { MIRROR_CUSTOM_BLOCK_STYLES } from "@/lib/mirror-custom-blocks-html";

/** Admin widget CSS — mirror iframe <head> enjeksiyonunun theme shell karşılığı */
export function ThemeShellInjectedStyles() {
  return <style id="kn-custom-blocks-css">{MIRROR_CUSTOM_BLOCK_STYLES}</style>;
}
