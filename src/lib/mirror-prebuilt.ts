import "server-only";

export {
  hasPrebuiltMirrorHtml,
  isMirrorDevLiveRebuild,
  preferPrebuiltMirrorHtml,
  prebuiltMirrorAbs,
  prebuiltMirrorRel,
  readPrebuiltMirrorHtml,
  MIRROR_PREBUILT_PREFIX,
} from "@/lib/mirror-prebuilt-io";

export { prebuiltMirrorPublicUrl, MIRROR_PREBUILT_PREFIX } from "@/lib/mirror-iframe-src";

export { resolveMirrorIframeSrc, resolveStoreMirrorIframeSrc } from "@/lib/mirror-prebuilt-resolve";
