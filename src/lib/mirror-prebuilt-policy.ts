import "server-only";

import { hasPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";

/** true → her istekte buildMirrorHtmlCore (yavaş, mirror inject kodu geliştirirken) */
export function isMirrorDevLiveRebuild(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.MIRROR_DEV_LIVE === "1";
}

/** Canlı ile aynı statik HTML — dosya varsa ve live mod kapalıysa */
export function preferPrebuiltMirrorHtml(normalized: string): boolean {
  if (isMirrorDevLiveRebuild()) return false;
  if (process.env.NODE_ENV === "production") return true;
  return hasPrebuiltMirrorHtml(normalized);
}
