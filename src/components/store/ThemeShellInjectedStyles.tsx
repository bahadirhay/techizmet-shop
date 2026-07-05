import { MIRROR_CUSTOM_BLOCK_STYLES } from "@/lib/mirror-custom-blocks-html";
import { CONTACT_FORM_CENTERED_CSS } from "@/lib/mirror-contact-form-styles";

/** Admin widget + iletişim formu CSS — mirror <head> enjeksiyonunun theme shell karşılığı */
export function ThemeShellInjectedStyles() {
  return (
    <>
      <style id="kn-custom-blocks-css">{MIRROR_CUSTOM_BLOCK_STYLES}</style>
      <style id="kn-contact-form-centered">{CONTACT_FORM_CENTERED_CSS}</style>
    </>
  );
}
