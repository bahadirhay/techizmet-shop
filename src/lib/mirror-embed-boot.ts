/** Mirror iframe — vitrin boot script (public JS dosyası) */

export const MIRROR_EMBED_BOOT_SCRIPT_SRC = "/theme/techizmet-shop/mirror-embed-boot.js";
export const MIRROR_EMBED_BOOT_SCRIPT_ID = "kn-mirror-embed-boot";

export function injectMirrorEmbedBoot(doc: Document) {
  if (doc.getElementById(MIRROR_EMBED_BOOT_SCRIPT_ID)) return;
  const script = doc.createElement("script");
  script.id = MIRROR_EMBED_BOOT_SCRIPT_ID;
  script.src = MIRROR_EMBED_BOOT_SCRIPT_SRC;
  script.async = true;
  (doc.body ?? doc.documentElement).appendChild(script);
}
