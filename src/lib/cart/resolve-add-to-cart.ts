/** Sepete ekle — slug / varyant etiketi çözümleme */

import { prisma } from "@/lib/prisma";
import { pickDefaultVariant } from "@/lib/product-variants";

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
  const productId = String(input.productId ?? "").trim();
  const slug = String(input.slug ?? "").trim();
  const variantIdRaw = input.variantId ? String(input.variantId).trim() : "";
  const variantLabel = String(input.variantLabel ?? "").trim();

  if (!productId && !slug) {
    return { ok: false, error: "Ürün gerekli", status: 400 };
  }

  const product = productId
    ? await prisma.storeProduct.findFirst({
        where: { id: productId, siteId, published: true },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      })
    : await prisma.storeProduct.findFirst({
        where: { siteId, slug, published: true },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      });

  if (!product) {
    return { ok: false, error: "Ürün bulunamadı", status: 404 };
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
