/** Koleksiyonlar sayfası — main-collection-list grid sütun sayısı */

export type CollectionGridColumns = 3 | 4 | 5;

export function parseCollectionGridColumns(value: unknown): CollectionGridColumns | null {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (n === 3 || n === 4 || n === 5) return n;
  return null;
}

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

export function extractCollectionGridColumnsFromHtml(
  html: string,
  sectionKey: string,
): CollectionGridColumns {
  const block = sliceSectionHtml(html, sectionKey);
  const fromVar = block.match(/--column_count:\s*(\d)/i)?.[1];
  const parsed = parseCollectionGridColumns(fromVar);
  if (parsed) return parsed;

  const fromClass = block.match(/column-count-(\d)/i)?.[1];
  const fromClassParsed = parseCollectionGridColumns(fromClass);
  if (fromClassParsed) return fromClassParsed;

  return 3;
}

export function applyCollectionGridColumns(section: Element, columns: CollectionGridColumns) {
  const host = section as HTMLElement;
  const wrapper = section.querySelector(".collection-list--wrapper.stacked");
  if (wrapper) {
    wrapper.classList.forEach((cls) => {
      if (/^column-count-\d+$/.test(cls)) wrapper.classList.remove(cls);
    });
    wrapper.classList.add(`column-count-${columns}`);
  }

  host.style.setProperty("--column_count", String(columns));

  const styleBlocks = section.querySelectorAll("style");
  for (const styleEl of styleBlocks) {
    let css = styleEl.textContent ?? "";
    if (!css.includes("--column_count")) continue;
    css = css.replace(/--column_count:\s*\d+\s*;?/gi, `--column_count: ${columns};`);
    styleEl.textContent = css;
  }
}
