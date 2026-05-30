/** Mirror iframe — lazy-load Edge intervention (iframe tam sayfa) */

export function patchMirrorCriticalImageLoading(html: string): string {
  return html.replace(/\sloading=["']lazy["']/gi, "");
}
