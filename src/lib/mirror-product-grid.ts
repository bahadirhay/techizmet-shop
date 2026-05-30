/** Çok Satanlar — main-collection ürün grid (--row_count) */

export type ProductGridColumns = 3 | 4 | 5 | 6 | 7 | 8;

const VALID = new Set<number>([3, 4, 5, 6, 7, 8]);

export function parseProductGridColumns(value: unknown): ProductGridColumns | null {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (VALID.has(n)) return n as ProductGridColumns;
  return null;
}

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

export function extractProductGridColumnsFromHtml(
  html: string,
  sectionKey: string,
): ProductGridColumns {
  const block = sliceSectionHtml(html, sectionKey);
  const fromVar = block.match(/--row_count:\s*(\d+)/i)?.[1];
  const parsed = parseProductGridColumns(fromVar);
  return parsed ?? 5;
}

export function applyProductGridColumns(section: Element, columns: ProductGridColumns) {
  const host = section as HTMLElement;
  host.style.setProperty("--row_count", String(columns));

  const styleBlocks = section.querySelectorAll("style");
  for (const styleEl of styleBlocks) {
    let css = styleEl.textContent ?? "";
    if (!css.includes("--row_count")) continue;
    css = css.replace(/--row_count:\s*\d+\s*;?/gi, `--row_count: ${columns};`);
    styleEl.textContent = css;
  }
}
