/** Mirror — SVG ikon görünürlüğü (CurrentColor + CSS) */

const ICONS_CSS_HREF = "/theme/king-noor/mirror-icons-fix.css?v=4";

const EARLY_JS_CLASS = `<script id="kn-mirror-js-class">document.documentElement.className=document.documentElement.className.replace(/\\bno-js\\b/,"js");</script>`;

/** SVG attribute — yalnızca küçük harf currentColor geçerli */
export function fixMirrorSvgStrokeAttributes(html: string): string {
  return html
    .replace(/stroke="CurrentColor"/gi, 'stroke="currentColor"')
    .replace(/fill="CurrentColor"/gi, 'fill="currentColor"')
    .replace(/stroke='CurrentColor'/gi, "stroke='currentColor'")
    .replace(/fill='CurrentColor'/gi, "fill='currentColor'");
}

export function injectMirrorIconsFix(html: string): string {
  let out = fixMirrorSvgStrokeAttributes(html);

  if (!out.includes('id="kn-mirror-js-class"')) {
    out = out.replace(/<head>/i, `<head>${EARLY_JS_CLASS}`);
  }

  if (out.includes("mirror-icons-fix.css")) {
    return out.replace(/mirror-icons-fix\.css\?v=\d+/g, "mirror-icons-fix.css?v=4");
  }

  return out.replace(/<\/head>/i, `<link rel="stylesheet" href="${ICONS_CSS_HREF}" id="kn-mirror-icons-fix" />\n</head>`);
}
