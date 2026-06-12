/** Mağaza vitrininde gösterilen admin HTML — script ve olay işleyicilerini kaldırır */

const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const ON_ATTR_RE = /\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL_RE = /javascript:/gi;

export function sanitizePublicHtml(html: string): string {
  if (!html?.trim()) return "";
  return html.replace(SCRIPT_RE, "").replace(ON_ATTR_RE, "").replace(JS_URL_RE, "");
}
