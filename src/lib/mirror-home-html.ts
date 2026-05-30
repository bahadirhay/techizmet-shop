import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const themeRoot = join(process.cwd(), "public/theme/techizmet-shop");
const builtHome = join(themeRoot, "mirror/index.html");
const mirrorRoot =
  process.env.THEME_MIRROR_PATH?.trim() || "C:/My Web Sites/shop/theking-noor.myshopify.com";
const srcHome = join(mirrorRoot, "en-us.html");

export function readMirrorHomeHtml(): string | null {
  if (existsSync(builtHome)) return readFileSync(builtHome, "utf8");
  if (existsSync(srcHome)) return readFileSync(srcHome, "utf8");
  return null;
}
