import { applyCatalogPrice, getCustomerGroupPricing } from "@/lib/customer-group-pricing";
import {
  applyCampaignToCart,
  cartLineKey,
  type CampaignRecord,
  type PromoLineMeta,
} from "@/lib/campaign-engine";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import {
  PRODUCT_KIND_BUNDLE,
  buildComponentsSnapshotForOrder,
  computeBundleAvailableQty,
  expandBundleStockDeductions,
  loadResolvedBundleComponents,
  syncBundlesContainingProducts,
} from "@/lib/product-bundle";
import { variantCatalogPrices } from "@/lib/product-variants";
import { prisma } from "@/lib/prisma";
import { resolveOrderNumberPrefix, generateOrderNumber } from "@/lib/admin/order-number";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import type {
  CartLineInput,
  CartSessionData,
  CartView,
  CartLineView,
  ShippingOption,
} from "@/lib/cart/types";

function nowInRange(startsAt: Date | null, endsAt: Date | null): boolean {
  const now = Date.now();
  if (startsAt && startsAt.getTime() > now) return false;
  if (endsAt && endsAt.getTime() < now) return false;
  return true;
}

function campaignValid(c: CampaignRecord): boolean {
  if (!c.active || !nowInRange(c.startsAt, c.endsAt)) return false;
  if (c.maxUses != null && c.usedCount >= c.maxUses) return false;
  return true;
}

async function resolveCampaign(
  siteId: string,
  couponCode: string | null,
): Promise<CampaignRecord | null> {
  if (couponCode?.trim()) {
    const c = await prisma.storeCampaign.findFirst({
      where: { siteId, code: couponCode.trim().toUpperCase(), active: true },
    });
    return c && campaignValid(c as CampaignRecord) ? (c as CampaignRecord) : null;
  }

  const auto = await prisma.storeCampaign.findFirst({
    where: { siteId, active: true, autoApply: true },
    orderBy: { createdAt: "desc" },
  });
  return auto && campaignValid(auto as CampaignRecord) ? (auto as CampaignRecord) : null;
}

export async function applyCampaign(
  siteId: string,
  subtotalMinor: number,
  couponCode: string | null,
  promoLines: PromoLineMeta[] = [],
): Promise<{
  campaignId: string | null;
  discountMinor: number;
  freeShipping: boolean;
  label: string | null;
  error: string | null;
  lineDiscounts: Map<string, number>;
}> {
  const settings = await getSiteSettings(siteId);
  const threshold = settings.store?.freeShippingOverMinor;

  const campaign = await resolveCampaign(siteId, couponCode);

  if (!campaign) {
    if (couponCode?.trim()) {
      return {
        campaignId: null,
        discountMinor: 0,
        freeShipping: false,
        label: null,
        error: "Geçersiz veya süresi dolmuş kupon",
        lineDiscounts: new Map(),
      };
    }
    if (threshold != null && subtotalMinor >= threshold) {
      return {
        campaignId: null,
        discountMinor: 0,
        freeShipping: true,
        label: "Ücretsiz kargo",
        error: null,
        lineDiscounts: new Map(),
      };
    }
    return {
      campaignId: null,
      discountMinor: 0,
      freeShipping: false,
      label: null,
      error: null,
      lineDiscounts: new Map(),
    };
  }

  const result = applyCampaignToCart(campaign, promoLines, subtotalMinor);

  const freeShipping =
    result.freeShipping ||
    (threshold != null && subtotalMinor >= threshold);

  return {
    campaignId: result.campaignId,
    discountMinor: result.error ? 0 : result.discountMinor,
    freeShipping: Boolean(freeShipping),
    label: result.error ? null : result.label,
    error: result.error,
    lineDiscounts: result.error ? new Map() : result.lineDiscounts,
  };
}

export async function buildCartView(
  session: CartSessionData,
  siteId?: string,
  customerId?: string | null,
): Promise<CartView> {
  const site = siteId ? await prisma.storeSite.findUnique({ where: { id: siteId } }) : await getDefaultSite();
  const sid = site!.id;
  const errors: string[] = [];
  const items: CartLineView[] = [];
  const promoLines: PromoLineMeta[] = [];

  const [settings, memberPricing] = await Promise.all([
    getSiteSettings(sid),
    getCustomerGroupPricing(customerId, sid),
  ]);
  const thresholdMinor = settings.store?.freeShippingOverMinor ?? 0;

  const emptyCart: CartView = {
    items: [],
    itemCount: 0,
    subtotalMinor: 0,
    discountMinor: 0,
    shippingMinor: 0,
    totalMinor: 0,
    couponCode: session.couponCode ?? null,
    couponLabel: null,
    campaignId: null,
    freeShipping: false,
    freeShippingThresholdMinor: thresholdMinor,
    freeShippingRemainingMinor: thresholdMinor,
    memberDiscountPercent: memberPricing?.percent ?? 0,
    memberGroupName: memberPricing?.groupName ?? null,
    errors: [],
  };

  if (!session.items.length) {
    return emptyCart;
  }

  const productIds = session.items.map((i) => i.productId);
  const products = await prisma.storeProduct.findMany({
    where: { siteId: sid, id: { in: productIds }, published: true },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      categoryLinks: { select: { categoryId: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const bundleIds = products.filter((p) => p.kind === PRODUCT_KIND_BUNDLE).map((p) => p.id);
  const bundleStock = new Map<string, number>();
  await Promise.all(
    bundleIds.map(async (id) => {
      bundleStock.set(id, await computeBundleAvailableQty(prisma, id));
    }),
  );

  for (const line of session.items) {
    const p = byId.get(line.productId);
    if (!p) {
      errors.push("Sepetteki bir ürün artık mevcut değil");
      continue;
    }
    const isBundle = p.kind === PRODUCT_KIND_BUNDLE;
    const hasVariants = !isBundle && p.variants.length > 0;
    const variant = !isBundle && line.variantId ? p.variants.find((v) => v.id === line.variantId) : null;
    if (hasVariants && !variant) {
      errors.push(`${p.title}: lütfen bir seçenek (ör. hacim) seçin`);
      continue;
    }
    if (isBundle && line.variantId) {
      errors.push(`${p.title}: paket için geçersiz seçenek`);
      continue;
    }
    const stockQty = isBundle
      ? (bundleStock.get(p.id) ?? 0)
      : variant
        ? variant.stockQty
        : p.stockQty;
    const catalogPrice = variant ? variant.priceMinor : p.priceMinor;
    const catalogCompare = variant ? variant.compareAtMinor : p.compareAtMinor;
    const qty = Math.max(1, Math.min(line.qty, stockQty > 0 ? stockQty : 0));
    if (stockQty < 1) {
      errors.push(`${p.title} tükendi`);
      continue;
    }
    if (line.qty > stockQty) {
      errors.push(`${p.title} için en fazla ${stockQty} adet`);
    }
    const priced = variant
      ? variantCatalogPrices(variant, memberPricing)
      : (() => {
          const base = applyCatalogPrice(catalogPrice, memberPricing);
          return {
            unitMinor: base.unitMinor,
            listPriceMinor: base.listPriceMinor,
            compareAtMinor:
              catalogCompare && catalogCompare > base.unitMinor
                ? catalogCompare
                : base.listPriceMinor > base.unitMinor
                  ? base.listPriceMinor
                  : null,
          };
        })();
    const baseTitle = formatProductDisplayTitle({
      title: p.title,
      weightGrams: p.weightGrams,
      pieceCount: p.pieceCount,
    });
    const title = variant ? `${baseTitle} — ${variant.label}` : baseTitle;
    const lineKey = cartLineKey(p.id, variant?.id ?? null);
    const lineMinor = priced.unitMinor * qty;
    const categoryIds = p.categoryLinks.map((l) => l.categoryId);

    promoLines.push({
      lineKey,
      productId: p.id,
      variantId: variant?.id ?? null,
      categoryId: p.categoryId,
      categoryIds,
      collectionId: p.collectionId,
      brandId: p.brandId,
      unitMinor: priced.unitMinor,
      qty,
      lineMinor,
    });

    items.push({
      productId: p.id,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      slug: p.slug,
      title,
      imageUrl: p.imageUrl,
      sku: variant?.sku ?? p.sku,
      listPriceMinor: priced.listPriceMinor,
      unitMinor: priced.unitMinor,
      compareAtMinor: priced.compareAtMinor,
      qty,
      lineMinor,
      discountMinor: 0,
      lineTotalMinor: lineMinor,
      maxQty: stockQty,
      inStock: stockQty > 0,
      vatRate: p.vatRate,
    });
  }

  const subtotalMinor = items.reduce((s, i) => s + i.lineMinor, 0);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  const campaign = await applyCampaign(
    sid,
    subtotalMinor,
    session.couponCode ?? null,
    promoLines,
  );
  if (campaign.error) errors.push(campaign.error);

  const discountMinor = campaign.error ? 0 : campaign.discountMinor;

  for (const item of items) {
    const key = cartLineKey(item.productId, item.variantId);
    const lineDisc = campaign.lineDiscounts.get(key) ?? 0;
    item.discountMinor = lineDisc;
    item.lineTotalMinor = Math.max(0, item.lineMinor - lineDisc);
  }

  const afterDiscount = Math.max(0, subtotalMinor - discountMinor);
  const freeShippingRemainingMinor =
    thresholdMinor > 0 && !campaign.freeShipping
      ? Math.max(0, thresholdMinor - subtotalMinor)
      : 0;

  return {
    items,
    itemCount,
    subtotalMinor,
    discountMinor,
    shippingMinor: 0,
    totalMinor: afterDiscount,
    couponCode: session.couponCode ?? null,
    couponLabel: campaign.label,
    campaignId: campaign.campaignId,
    freeShipping: campaign.freeShipping,
    freeShippingThresholdMinor: thresholdMinor,
    freeShippingRemainingMinor,
    memberDiscountPercent: memberPricing?.percent ?? 0,
    memberGroupName: memberPricing?.groupName ?? null,
    errors,
  };
}

export async function getShippingOptions(
  siteId: string,
  subtotalMinor: number,
  freeShipping: boolean,
  totalDesi = 1,
): Promise<ShippingOption[]> {
  if (freeShipping) return [];

  const carriers = await prisma.shippingCarrier.findMany({
    where: { siteId, active: true },
    include: { rates: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  const options: ShippingOption[] = [];

  for (const c of carriers) {
    for (const r of c.rates) {
      if (r.minDesi != null && totalDesi < r.minDesi) continue;
      if (r.maxDesi != null && totalDesi > r.maxDesi) continue;
      let price = r.priceMinor;
      if (r.freeOverMinor != null && subtotalMinor >= r.freeOverMinor) price = 0;
      options.push({
        carrierId: c.id,
        carrierName: c.name,
        rateId: r.id,
        rateName: r.name,
        priceMinor: price,
      });
    }
  }

  return options.sort((a, b) => a.priceMinor - b.priceMinor);
}

function cartLineKeyLocal(productId: string, variantId?: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

function lineMatches(i: CartLineInput, productId: string, variantId?: string | null) {
  return cartLineKeyLocal(i.productId, i.variantId) === cartLineKeyLocal(productId, variantId);
}

export async function addToCart(
  session: CartSessionData,
  productId: string,
  qty: number,
  variantId?: string | null,
): Promise<CartSessionData> {
  const items = [...session.items];
  const idx = items.findIndex((i) => lineMatches(i, productId, variantId));
  if (idx >= 0) {
    items[idx] = {
      productId,
      variantId: variantId ?? null,
      qty: items[idx]!.qty + qty,
    };
  } else items.push({ productId, variantId: variantId ?? null, qty });
  return { ...session, items };
}

export async function updateCartQty(
  session: CartSessionData,
  productId: string,
  qty: number,
  variantId?: string | null,
): Promise<CartSessionData> {
  if (qty <= 0) {
    return {
      ...session,
      items: session.items.filter((i) => !lineMatches(i, productId, variantId)),
    };
  }
  return {
    ...session,
    items: session.items.map((i) =>
      lineMatches(i, productId, variantId) ? { ...i, qty } : i,
    ),
  };
}

export { generateOrderNumber } from "@/lib/admin/order-number";

export async function createOrderFromCart(params: {
  siteId: string;
  session: CartSessionData;
  customerId?: string | null;
  customer: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    address: {
      city: string;
      district: string;
      line1: string;
      postalCode?: string;
    };
  };
  carrierId: string;
  rateId: string;
  paymentMethod: string;
  guestCheckout: boolean;
  visitorKey?: string | null;
}): Promise<{ orderId: string; orderNumber: string; customerId: string | null }> {
  let orderCustomerId = params.customerId ?? null;
  if (params.customer.email) {
    const existing = await prisma.storeCustomer.findFirst({
      where: { siteId: params.siteId, email: params.customer.email },
    });
    if (existing) {
      orderCustomerId = existing.id;
      if (params.customerId === existing.id) {
        await prisma.storeCustomer.update({
          where: { id: existing.id },
          data: {
            phone: params.customer.phone,
            firstName: params.customer.firstName,
            lastName: params.customer.lastName,
          },
        });
      }
    } else {
      const created = await prisma.storeCustomer.create({
        data: {
          siteId: params.siteId,
          email: params.customer.email,
          phone: params.customer.phone,
          firstName: params.customer.firstName,
          lastName: params.customer.lastName,
        },
      });
      orderCustomerId = created.id;
    }
  }

  const cart = await buildCartView(params.session, params.siteId, orderCustomerId);
  if (cart.items.length === 0) throw new Error("Sepet boş");
  if (cart.errors.length) throw new Error(cart.errors[0]);

  const discountMinor = cart.discountMinor;

  const totalDesi = Math.max(
    1,
    (
      await prisma.storeProduct.findMany({
        where: { id: { in: cart.items.map((i) => i.productId) } },
        select: { desi: true },
      })
    ).reduce((s, p) => s + (p.desi ?? 1), 0),
  );

  const shippingOptions = await getShippingOptions(
    params.siteId,
    cart.subtotalMinor - discountMinor,
    cart.freeShipping,
    totalDesi,
  );

  const selected = cart.freeShipping
    ? null
    : shippingOptions.find((o) => o.carrierId === params.carrierId && o.rateId === params.rateId);
  const shippingMinor = cart.freeShipping ? 0 : (selected?.priceMinor ?? 0);

  if (!cart.freeShipping && !selected) throw new Error("Kargo seçimi geçersiz");

  const carrierId = cart.freeShipping ? null : params.carrierId;

  const totalMinor = Math.max(0, cart.subtotalMinor - discountMinor + shippingMinor);
  const customerName = `${params.customer.firstName} ${params.customer.lastName}`.trim();

  const orderNotes: string[] = [];
  if (params.session.couponCode) orderNotes.push(`Kupon: ${params.session.couponCode}`);
  else if (cart.couponLabel && cart.campaignId) {
    orderNotes.push(`Kampanya: ${cart.couponLabel}`);
  }
  if (cart.memberGroupName && cart.memberDiscountPercent > 0) {
    orderNotes.push(`Üye grubu: ${cart.memberGroupName} (%${cart.memberDiscountPercent} indirim)`);
  }

  const settings = await getSiteSettings(params.siteId);
  let groupPrefix: string | null = null;
  if (orderCustomerId) {
    const member = await prisma.storeCustomer.findFirst({
      where: { id: orderCustomerId, siteId: params.siteId },
      select: { customerGroup: { select: { orderNumberPrefix: true, active: true } } },
    });
    if (member?.customerGroup?.active && member.customerGroup.orderNumberPrefix?.trim()) {
      groupPrefix = member.customerGroup.orderNumberPrefix;
    }
  }
  const orderNumber = generateOrderNumber(resolveOrderNumberPrefix(settings, groupPrefix));

  const cartProducts = await prisma.storeProduct.findMany({
    where: { id: { in: cart.items.map((i) => i.productId) } },
    select: { id: true, kind: true },
  });
  const kindById = new Map(cartProducts.map((p) => [p.id, p.kind]));

  const orderLineExtras = new Map<
    string,
    { lineKind: string; bundleProductId: string | null; componentsSnapshotJson: string | null }
  >();
  const componentProductIdsForSync = new Set<string>();

  const order = await prisma.$transaction(async (tx) => {
    for (const line of cart.items) {
      const lineKey = cartLineKey(line.productId, line.variantId);
      if (kindById.get(line.productId) === PRODUCT_KIND_BUNDLE) {
        const components = await loadResolvedBundleComponents(tx, line.productId);
        const deductions = expandBundleStockDeductions(components, line.qty);
        for (const d of deductions) {
          if (d.variantId) {
            const updated = await tx.storeProductVariant.updateMany({
              where: {
                id: d.variantId,
                productId: d.productId,
                stockQty: { gte: d.qty },
              },
              data: { stockQty: { decrement: d.qty } },
            });
            if (updated.count === 0) throw new Error(`${line.title} için yeterli stok yok`);
            const sum = await tx.storeProductVariant.aggregate({
              where: { productId: d.productId },
              _sum: { stockQty: true },
            });
            await tx.storeProduct.update({
              where: { id: d.productId },
              data: { stockQty: sum._sum.stockQty ?? 0 },
            });
          } else {
            const updated = await tx.storeProduct.updateMany({
              where: { id: d.productId, stockQty: { gte: d.qty } },
              data: { stockQty: { decrement: d.qty } },
            });
            if (updated.count === 0) throw new Error(`${line.title} için yeterli stok yok`);
          }
          componentProductIdsForSync.add(d.productId);
        }
        orderLineExtras.set(lineKey, {
          lineKind: PRODUCT_KIND_BUNDLE,
          bundleProductId: line.productId,
          componentsSnapshotJson: JSON.stringify(
            await buildComponentsSnapshotForOrder(tx, components, line.qty),
          ),
        });
      } else if (line.variantId) {
        const updated = await tx.storeProductVariant.updateMany({
          where: { id: line.variantId, productId: line.productId, stockQty: { gte: line.qty } },
          data: { stockQty: { decrement: line.qty } },
        });
        if (updated.count === 0) throw new Error(`${line.title} için yeterli stok yok`);
        const sum = await tx.storeProductVariant.aggregate({
          where: { productId: line.productId },
          _sum: { stockQty: true },
        });
        await tx.storeProduct.update({
          where: { id: line.productId },
          data: { stockQty: sum._sum.stockQty ?? 0 },
        });
        orderLineExtras.set(lineKey, {
          lineKind: "standard",
          bundleProductId: null,
          componentsSnapshotJson: null,
        });
      } else {
        const updated = await tx.storeProduct.updateMany({
          where: { id: line.productId, stockQty: { gte: line.qty } },
          data: { stockQty: { decrement: line.qty } },
        });
        if (updated.count === 0) throw new Error(`${line.title} için yeterli stok yok`);
        orderLineExtras.set(lineKey, {
          lineKind: "standard",
          bundleProductId: null,
          componentsSnapshotJson: null,
        });
      }
    }

    if (componentProductIdsForSync.size) {
      await syncBundlesContainingProducts(tx, [...componentProductIdsForSync]);
    }

    if (cart.campaignId) {
      await tx.storeCampaign.update({
        where: { id: cart.campaignId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return tx.storeOrder.create({
      data: {
        siteId: params.siteId,
        orderNumber,
        status: "pending",
        customerId: orderCustomerId,
        carrierId,
        customerEmail: params.customer.email,
        customerPhone: params.customer.phone,
        customerName,
        shippingAddressJson: JSON.stringify(params.customer.address),
        subtotalMinor: cart.subtotalMinor,
        shippingMinor,
        discountMinor,
        totalMinor,
        paymentMethod: params.paymentMethod,
        paymentStatus: params.paymentMethod === "cod" ? "pending" : "unpaid",
        adminNotes: orderNotes.length ? orderNotes.join(" · ") : null,
        visitorKey: params.visitorKey?.trim() || null,
        lines: {
          create: cart.items.map((line) => {
            const extras = orderLineExtras.get(cartLineKey(line.productId, line.variantId)) ?? {
              lineKind: "standard",
              bundleProductId: null,
              componentsSnapshotJson: null,
            };
            return {
              productId: line.productId,
              variantId: line.variantId,
              variantLabel: line.variantLabel,
              title: line.title,
              sku: line.sku,
              qty: line.qty,
              unitMinor: line.unitMinor,
              lineMinor: line.lineMinor,
              discountMinor: line.discountMinor,
              vatRate: line.vatRate,
              lineKind: extras.lineKind,
              bundleProductId: extras.bundleProductId,
              componentsSnapshotJson: extras.componentsSnapshotJson,
            };
          }),
        },
      },
    });
  });

  const productIds = [
    ...new Set([
      ...cart.items.map((i) => i.productId),
      ...componentProductIdsForSync,
    ]),
  ];
  try {
    const { syncStockToAllMarketplaces } = await import("@/lib/marketplace/stock-sync-all");
    await syncStockToAllMarketplaces(params.siteId, productIds);
  } catch {
    /* stok senkron hatası siparişi iptal etmez */
  }

  try {
    const { applyOrderFinanceSnapshot } = await import("@/lib/finance/order-economics");
    await applyOrderFinanceSnapshot(params.siteId, order.id);
  } catch {
    /* ekonomi snapshot hatası siparişi iptal etmez */
  }

  return { orderId: order.id, orderNumber: order.orderNumber, customerId: orderCustomerId };
}
