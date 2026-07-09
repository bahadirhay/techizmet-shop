import { applyCatalogPrice, getCustomerGroupPricing } from "@/lib/customer-group-pricing";
import {
  applyAutoCampaignsToCart,
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
import { ensureGeliverCheckoutRate } from "@/lib/shipping/geliver/ensure-checkout-rate";
import { prepareGeliverCheckoutRates } from "@/lib/shipping/geliver/checkout-quotes";
import { LEGACY_GELIVER_CARRIER_CODE } from "@/lib/shipping/geliver/provider-labels";
import { geliverReady } from "@/lib/shipping/geliver/settings";
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

function toCampaignRecord(c: {
  id: string;
  name: string;
  code: string | null;
  type: string;
  percentOff: number | null;
  amountOffMinor: number | null;
  buyQuantity: number | null;
  payQuantity: number | null;
  scopeJson: string | null;
  autoApply: boolean;
  firstOrderOnly?: boolean;
  minCartMinor: number | null;
  freeShipping: boolean;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): CampaignRecord {
  return { ...c, firstOrderOnly: c.firstOrderOnly ?? false };
}

async function customerIsFirstOrder(
  siteId: string,
  customerId: string | null | undefined,
  email?: string | null,
): Promise<boolean> {
  if (customerId) {
    const count = await prisma.storeOrder.count({
      where: { siteId, customerId, status: { notIn: ["cancelled"] } },
    });
    return count === 0;
  }
  const normalized = email?.trim().toLowerCase();
  if (normalized) {
    const count = await prisma.storeOrder.count({
      where: { siteId, customerEmail: normalized, status: { notIn: ["cancelled"] } },
    });
    return count === 0;
  }
  return true;
}

function filterCampaignsForFirstOrder(
  campaigns: CampaignRecord[],
  isFirstOrder: boolean,
): CampaignRecord[] {
  return campaigns.filter((c) => !c.firstOrderOnly || isFirstOrder);
}

async function resolveAutoCampaigns(
  siteId: string,
  isFirstOrder: boolean,
): Promise<CampaignRecord[]> {
  const autos = await prisma.storeCampaign.findMany({
    where: { siteId, active: true, autoApply: true },
    orderBy: { createdAt: "desc" },
  });
  return filterCampaignsForFirstOrder(
    autos.map(toCampaignRecord).filter(campaignValid),
    isFirstOrder,
  );
}

export async function applyCampaign(
  siteId: string,
  subtotalMinor: number,
  couponCode: string | null,
  promoLines: PromoLineMeta[] = [],
  options?: { customerId?: string | null; customerEmail?: string | null },
): Promise<{
  campaignId: string | null;
  campaignIds: string[];
  discountMinor: number;
  freeShipping: boolean;
  label: string | null;
  error: string | null;
  lineDiscounts: Map<string, number>;
}> {
  const settings = await getSiteSettings(siteId);
  const threshold = settings.store?.freeShippingOverMinor;
  const isFirstOrder = await customerIsFirstOrder(
    siteId,
    options?.customerId,
    options?.customerEmail,
  );

  if (couponCode?.trim()) {
    const c = await prisma.storeCampaign.findFirst({
      where: { siteId, code: couponCode.trim().toUpperCase(), active: true },
    });
    const record = c ? toCampaignRecord(c) : null;
    if (!record || !campaignValid(record)) {
      return {
        campaignId: null,
        campaignIds: [],
        discountMinor: 0,
        freeShipping: false,
        label: null,
        error: "Geçersiz veya süresi dolmuş kupon",
        lineDiscounts: new Map(),
      };
    }
    if (record.firstOrderOnly && !isFirstOrder) {
      return {
        campaignId: null,
        campaignIds: [],
        discountMinor: 0,
        freeShipping: false,
        label: null,
        error: "Bu kupon yalnızca ilk siparişinizde geçerlidir",
        lineDiscounts: new Map(),
      };
    }
    const result = applyCampaignToCart(record, promoLines, subtotalMinor);
    const freeShipping =
      result.freeShipping || (threshold != null && subtotalMinor >= threshold);
    return {
      campaignId: result.campaignId,
      campaignIds: result.campaignIds,
      discountMinor: result.error ? 0 : result.discountMinor,
      freeShipping: Boolean(freeShipping),
      label: result.error ? null : result.label,
      error: result.error,
      lineDiscounts: result.error ? new Map() : result.lineDiscounts,
    };
  }

  const autoCampaigns = await resolveAutoCampaigns(siteId, isFirstOrder);
  if (autoCampaigns.length > 0) {
    const result = applyAutoCampaignsToCart(autoCampaigns, promoLines, subtotalMinor);
    if (result.campaignIds.length) {
      const freeShipping =
        result.freeShipping || (threshold != null && subtotalMinor >= threshold);
      return {
        campaignId: result.campaignId,
        campaignIds: result.campaignIds,
        discountMinor: result.discountMinor,
        freeShipping: Boolean(freeShipping),
        label: result.label,
        error: null,
        lineDiscounts: result.lineDiscounts,
      };
    }
  }

  if (threshold != null && subtotalMinor >= threshold) {
    return {
      campaignId: null,
      campaignIds: [],
      discountMinor: 0,
      freeShipping: true,
      label: "Ücretsiz kargo",
      error: null,
      lineDiscounts: new Map(),
    };
  }

  return {
    campaignId: null,
    campaignIds: [],
    discountMinor: 0,
    freeShipping: false,
    label: null,
    error: null,
    lineDiscounts: new Map(),
  };
}

export async function buildCartView(
  session: CartSessionData,
  siteId?: string,
  customerId?: string | null,
  customerEmail?: string | null,
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
    campaignIds: [],
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
    { customerId, customerEmail },
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
    campaignIds: campaign.campaignIds,
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

  const settings = await getSiteSettings(siteId);
  const geliverEnabled = geliverReady(settings);
  if (geliverEnabled) {
    await prepareGeliverCheckoutRates(siteId).catch(() => undefined);
  } else {
    await ensureGeliverCheckoutRate(siteId).catch(() => undefined);
  }

  const carriers = await prisma.shippingCarrier.findMany({
    where: { siteId, active: true },
    include: { rates: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  const options: ShippingOption[] = [];

  for (const c of carriers) {
    if (geliverEnabled && c.code === LEGACY_GELIVER_CARRIER_CODE) continue;
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
    billingAddress?: {
      city: string;
      district: string;
      line1: string;
      postalCode?: string;
      firstName?: string;
      lastName?: string;
    };
    billingTaxId?: string;
    billingTaxOffice?: string;
  };
  carrierId: string;
  rateId: string;
  paymentMethod: string;
  guestCheckout: boolean;
  visitorKey?: string | null;
  /** Kart ödemesi onaylandıktan sonra sipariş oluştur */
  cardPaymentConfirmed?: boolean;
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
            ...(params.customer.billingTaxId
              ? { taxId: params.customer.billingTaxId }
              : {}),
            ...(params.customer.billingTaxOffice
              ? { taxOffice: params.customer.billingTaxOffice }
              : {}),
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

  const cart = await buildCartView(
    params.session,
    params.siteId,
    orderCustomerId,
    params.customer.email,
  );
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

  if (params.paymentMethod === "open_account") {
    if (!orderCustomerId) throw new Error("Açık hesap için üye girişi gerekli");
    const { assertOpenAccountCredit } = await import("@/lib/finance/b2b-credit");
    await assertOpenAccountCredit(params.siteId, orderCustomerId, totalMinor);
  }

  const orderNotes: string[] = [];
  if (params.session.couponCode) orderNotes.push(`Kupon: ${params.session.couponCode}`);
  else if (cart.couponLabel && cart.campaignId) {
    orderNotes.push(`Kampanya: ${cart.couponLabel}`);
  }
  if (cart.memberGroupName && cart.memberDiscountPercent > 0) {
    orderNotes.push(`Üye grubu: ${cart.memberGroupName} (%${cart.memberDiscountPercent} indirim)`);
  }
  if (params.paymentMethod === "open_account") {
    orderNotes.push("Ödeme: açık hesap (vadeli)");
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
      const kind = kindById.get(line.productId) ?? "standard";
      if (kind === PRODUCT_KIND_BUNDLE) {
        const components = await loadResolvedBundleComponents(tx, line.productId);
        orderLineExtras.set(lineKey, {
          lineKind: PRODUCT_KIND_BUNDLE,
          bundleProductId: line.productId,
          componentsSnapshotJson: JSON.stringify(
            await buildComponentsSnapshotForOrder(tx, components, line.qty),
          ),
        });
        for (const d of expandBundleStockDeductions(components, line.qty)) {
          componentProductIdsForSync.add(d.productId);
        }
      } else {
        orderLineExtras.set(lineKey, {
          lineKind: "standard",
          bundleProductId: null,
          componentsSnapshotJson: null,
        });
      }
    }

    const isCardAwaitingPayment =
      params.paymentMethod === "card" && !params.cardPaymentConfirmed;

    const created = await tx.storeOrder.create({
      data: {
        siteId: params.siteId,
        orderNumber,
        status: isCardAwaitingPayment
          ? "awaiting_payment"
          : params.cardPaymentConfirmed
            ? "confirmed"
            : "pending",
        customerId: orderCustomerId,
        carrierId,
        customerEmail: params.customer.email,
        customerPhone: params.customer.phone,
        customerName,
        shippingAddressJson: JSON.stringify(params.customer.address),
        billingAddressJson: params.customer.billingAddress
          ? JSON.stringify(params.customer.billingAddress)
          : JSON.stringify(params.customer.address),
        billingTaxId: params.customer.billingTaxId ?? null,
        billingTaxOffice: params.customer.billingTaxOffice ?? null,
        subtotalMinor: cart.subtotalMinor,
        shippingMinor,
        discountMinor,
        totalMinor,
        paymentMethod: params.paymentMethod,
        paymentStatus:
          params.paymentMethod === "cod"
            ? "pending"
            : params.paymentMethod === "open_account"
              ? "open_account"
              : params.cardPaymentConfirmed
                ? "paid"
                : "unpaid",
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
      include: { lines: true },
    });

    const { recordOrderStockMovements } = await import("@/lib/stock/order-stock");
    if (!isCardAwaitingPayment) {
      await recordOrderStockMovements(tx, {
        siteId: params.siteId,
        orderId: created.id,
        lines: created.lines
          .filter((l): l is typeof l & { productId: string } => Boolean(l.productId))
          .map((l) => ({
            id: l.id,
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
            title: l.title,
          })),
        productKinds: kindById,
      });
    }

    if (componentProductIdsForSync.size) {
      await syncBundlesContainingProducts(tx, [...componentProductIdsForSync]);
    }

    const campaignIds = cart.campaignIds?.length
      ? cart.campaignIds
      : cart.campaignId
        ? [cart.campaignId]
        : [];
    for (const campaignId of campaignIds) {
      await tx.storeCampaign.update({
        where: { id: campaignId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
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

  if (orderCustomerId) {
    try {
      const { ensureCounterpartyAfterOrder } = await import(
        "@/lib/finance/ensure-site-member-counterparty"
      );
      await ensureCounterpartyAfterOrder(params.siteId, orderCustomerId, {
        firstName: params.customer.firstName,
        lastName: params.customer.lastName,
        email: params.customer.email,
        phone: params.customer.phone,
        billingTaxId: params.customer.billingTaxId,
        billingTaxOffice: params.customer.billingTaxOffice,
        billingAddress: params.customer.billingAddress ?? params.customer.address,
      });
    } catch (e) {
      console.error("[counterparty.auto]", e);
    }
  }

  if (params.paymentMethod === "open_account") {
    try {
      const { createOpenAccountFinanceInvoice } = await import(
        "@/lib/finance/open-account-invoice"
      );
      await createOpenAccountFinanceInvoice(params.siteId, order.id);
    } catch (e) {
      console.error("[finance.open-account-invoice]", e);
    }
  }

  return { orderId: order.id, orderNumber: order.orderNumber, customerId: orderCustomerId };
}
