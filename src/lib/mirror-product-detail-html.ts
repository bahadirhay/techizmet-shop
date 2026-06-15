import { parseHTML } from "@/lib/linkedom-server";
import { injectMirrorProductCommerceHtml } from "@/lib/mirror-product-commerce";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import { applyProductContentOverlay } from "@/lib/mirror-product-overlay";
import {
  applyProductDetailFromAdmin,
  type VitrinProductDetail,
} from "@/lib/mirror-product-detail-sync";

const PRODUCT_SYNC_GUARD = `<style id="kn-product-sync-guard">html:not([data-kn-product-sync]) #MainContent{visibility:hidden}</style>`;

/** Sunucu / prebuild — ürün başlık, galeri, fiyat HTML içine */
export function applyProductDetailToMirrorHtml(
  html: string,
  product: VitrinProductDetail,
  overlay: ProductContentOverlay = {},
  commerce?: MirrorProductCommercePayload | null,
  options?: { templateSlug?: string },
): string {
  const { document } = parseHTML(html);
  if (!document.getElementById("kn-product-sync-guard")) {
    document.head.insertAdjacentHTML("beforeend", PRODUCT_SYNC_GUARD);
  }
  applyProductDetailFromAdmin(document, product, options);
  applyProductContentOverlay(document, overlay);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  let out = `${doctype}\n${document.documentElement.outerHTML}`;
  if (commerce) out = injectMirrorProductCommerceHtml(out, commerce);
  return out;
}
