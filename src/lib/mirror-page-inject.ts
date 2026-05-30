/** Mirror iç sayfa — kök div içine HTML enjekte */

export function injectMirrorPageRoot(html: string, rootId: string, markup: string): string {
  const rootRe = new RegExp(
    `<div class="[^"]*" id="${rootId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">\\s*</div>`,
  );
  if (rootRe.test(html)) {
    return html.replace(rootRe, (m) => m.replace(/>\s*<\/div>$/, `>${markup}</div>`));
  }
  return html.replace(
    `id="${rootId}"`,
    `id="${rootId}">${markup}`,
  );
}
