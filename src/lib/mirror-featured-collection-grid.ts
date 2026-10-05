/** Öne çıkan ürünler — carousel → stacked grid (--column_count) */

export type FeaturedCollectionColumns = 3 | 4 | 5 | 6;

const VALID = new Set<number>([3, 4, 5, 6]);

export function parseFeaturedCollectionColumns(value: unknown): FeaturedCollectionColumns | null {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (VALID.has(n)) return n as FeaturedCollectionColumns;
  return null;
}

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

export function extractFeaturedCollectionColumnsFromHtml(
  html: string,
  sectionKey: string,
): FeaturedCollectionColumns {
  const block = sliceSectionHtml(html, sectionKey);
  const fromVar = block.match(/--column_count:\s*(\d+)/i)?.[1];
  const fromClass = block.match(/column-count-(\d+)/i)?.[1];
  const parsed = parseFeaturedCollectionColumns(fromVar) ?? parseFeaturedCollectionColumns(fromClass);
  return parsed ?? 4;
}

function destroySwiperIfAny(host: Element) {
  const anyHost = host as Element & { swiper?: { destroy: (deleteInstance?: boolean, cleanStyles?: boolean) => void } };
  try {
    anyHost.swiper?.destroy(true, true);
  } catch {
    /* ignore */
  }
  if ("swiper" in anyHost) {
    try {
      delete (anyHost as { swiper?: unknown }).swiper;
    } catch {
      /* ignore */
    }
  }
}

/** Carousel tek satırı kapatıp N sütunlu sarmalayan grid açar */
export function applyFeaturedCollectionGrid(
  section: Element,
  columns: FeaturedCollectionColumns = 4,
) {
  const wrapper = section.querySelector(".featured-collection--wrapper");
  if (!wrapper) return;

  const cols = parseFeaturedCollectionColumns(columns) ?? 4;
  const host = section as HTMLElement;
  host.style.setProperty("--column_count", String(cols));

  for (const styleEl of section.querySelectorAll("style")) {
    let css = styleEl.textContent ?? "";
    if (css.includes("--column_count")) {
      css = css.replace(/--column_count:\s*\d+\s*;?/gi, `--column_count: ${cols};`);
      styleEl.textContent = css;
    }
  }

  const className = wrapper.getAttribute("class") ?? "";
  let next = className
    .replace(/\bcarousel\b/g, "")
    .replace(/\bmobile-swipe\b/g, "")
    .replace(/\bcolumn-count-\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!/\bstacked\b/.test(next)) next = `${next} stacked`.trim();
  next = `${next} column-count-${cols}`.replace(/\s+/g, " ").trim();
  wrapper.setAttribute("class", next);
  wrapper.setAttribute("data-view", "stacked");

  const outer =
    section.querySelector(".featured-collection--outer") ??
    wrapper.closest(".featured-collection--outer");
  if (outer) {
    destroySwiperIfAny(outer);
    outer.removeAttribute("data-swiper");
    const outerClass = (outer.getAttribute("class") ?? "").replace(/\bswiper\b/g, "").replace(/\s+/g, " ").trim();
    outer.setAttribute("class", outerClass || "featured-collection--outer");
    (outer as HTMLElement).style.overflow = "visible";
  }

  section.querySelectorAll(".swiper--custom-buttons, .swiper-scrollbar, .swiper-pagination").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
}
