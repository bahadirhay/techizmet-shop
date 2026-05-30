import { readMirrorProductHtml } from "@/lib/mirror-product-content";
import {
  extractProductExploreLooks,
  type ProductExploreLook,
} from "@/lib/product-explore-looks";

/** Mirror HTML'den EXPLORE kartları — yalnızca sunucu/script (node:fs). */
export function loadMirrorProductExploreLooks(slug: string): ProductExploreLook[] {
  const html = readMirrorProductHtml(slug);
  if (!html) return [];
  return extractProductExploreLooks(html);
}
