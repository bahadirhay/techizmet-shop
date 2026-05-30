/** DOM etiket kontrolleri — tarayıcı + linkedom (HTML* global yok) */

function nodeName(el: unknown): string {
  if (!el || typeof el !== "object") return "";
  const n = el as { nodeName?: string; tagName?: string };
  return String(n.nodeName ?? n.tagName ?? "").toUpperCase();
}

export function isAnchorNode(el: unknown): el is HTMLAnchorElement {
  return nodeName(el) === "A";
}

export function isImageNode(el: unknown): el is HTMLImageElement {
  return nodeName(el) === "IMG";
}

export function isInputNode(el: unknown): el is HTMLInputElement {
  return nodeName(el) === "INPUT";
}

export function isLinkNode(el: unknown): el is HTMLLinkElement {
  return nodeName(el) === "LINK";
}

export function isElementNode(el: unknown): el is HTMLElement {
  return !!el && typeof el === "object" && "nodeType" in el;
}
