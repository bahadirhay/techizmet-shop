/** Sepete ekle — slug / varyant etiketi çözümleme */

import { prisma } from "@/lib/prisma";
import { computeBundleAvailableQty, PRODUCT_KIND_BUNDLE } from "@/lib/product-bundle";
import { pickDefaultVariant } from "@/lib/product-variants";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

export type AddToCartInput = {
  productId?: string;
  slug?: string;
  variantId?: string | null;
  variantLabel?: string;
  qty?: number;
};

export type ResolvedAddToCart = {
  productId: string;
  variantId: string | null;
  qty: number;
};

function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

function matchVariantByLabel(
  variants: { id: string; label: string; stockQty: number; isDefault: boolean; sortOrder: number }[],
  label: string,
) {
  const key = normLabel(label);
  if (!key) return null;
  return (
    variants.find((v) => normLabel(v.label) === key) ??
    variants.find((v) => key.startsWith(normLabel(v.label))) ??
    null
  );
}

export async function resolveAddToCartInput(
  siteId: string,
  input: AddToCartInput,
): Promise<{ ok: true; data: ResolvedAddToCart } | { ok: false; error: string; status: number }> {
  const qty = Math.max(1, parseInt(String(input.qty ?? 1), 10) || 1);
  let productId = String(input.productId ?? "").trim();
  let slug = String(input.slug ?? "")
    .trim()
    .replace(/\.html$/i, "");
  if (/^\d+$/.test(slug)) slug = "";
  if (/^\d+$/.test(productId)) productId = "";
  const variantIdRaw = input.variantId ? String(input.variantId).trim() : "";
  const variantLabel = String(input.variantLabel ?? "").trim();

  if (!productId && !slug) {
    return { ok: false, error: "Ürün gerekli", status: 400 };
  }

  const product = productId
    ? await prisma.storeProduct.findFirst({
        where: { id: productId, siteId, ...storefrontListedWhere },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      })
    : await prisma.storeProduct.findFirst({
        where: { siteId, slug, ...storefrontListedWhere },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      });

  if (!product) {
    return { ok: false, error: "Ürün bulunamadı", status: 404 };
  }

  if (product.kind === PRODUCT_KIND_BUNDLE) {
    const available = await computeBundleAvailableQty(prisma, product.id);
    if (available < 1) return { ok: false, error: "Ürün tükendi", status: 400 };
    if (qty > available) {
      return { ok: false, error: `En fazla ${available} adet eklenebilir`, status: 400 };
    }
    return {
      ok: true,
      data: { productId: product.id, variantId: null, qty },
    };
  }

  let variantId: string | null = null;

  if (product.variants.length > 0) {
    if (variantIdRaw) {
      const variant = product.variants.find((v) => v.id === variantIdRaw);
      if (!variant) return { ok: false, error: "Geçersiz seçenek", status: 400 };
      if (variant.stockQty < 1) return { ok: false, error: "Bu seçenek tükendi", status: 400 };
      variantId = variant.id;
    } else if (variantLabel) {
      const variant = matchVariantByLabel(product.variants, variantLabel);
      if (!variant) {
        return { ok: false, error: "Lütfen bir seçenek seçin (ör. 30ml)", status: 400 };
      }
      if (variant.stockQty < 1) return { ok: false, error: "Bu seçenek tükendi", status: 400 };
      variantId = variant.id;
    } else {
      const def = pickDefaultVariant(product.variants);
      if (!def) return { ok: false, error: "Lütfen bir seçenek seçin", status: 400 };
      if (def.stockQty < 1) return { ok: false, error: "Bu seçenek tükendi", status: 400 };
      variantId = def.id;
    }
  } else if (product.stockQty < 1) {
    return { ok: false, error: "Ürün tükendi", status: 400 };
  }

  return {
    ok: true,
    data: { productId: product.id, variantId, qty },
  };
}
