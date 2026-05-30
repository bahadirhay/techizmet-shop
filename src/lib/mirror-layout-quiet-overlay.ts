/** İstemci — layout quiet yaması (eski/cache HTML yedek) */

import {
  LAYOUT_QUIET_SCRIPT_ID,
  MIRROR_LAYOUT_QUIET_SCRIPT,
} from "@/lib/mirror-layout-quiet-script";

export function installMirrorLayoutQuiet(doc: Document) {
  if (doc.getElementById(LAYOUT_QUIET_SCRIPT_ID)) return;
  const script = doc.createElement("script");
  script.id = LAYOUT_QUIET_SCRIPT_ID;
  script.textContent = MIRROR_LAYOUT_QUIET_SCRIPT;
  const head = doc.head ?? doc.documentElement;
  head.insertBefore(script, head.firstChild);
}
