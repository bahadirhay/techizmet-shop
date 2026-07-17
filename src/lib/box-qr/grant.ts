import "server-only";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCartSession } from "@/lib/cart/session";
import { getSiteSettings } from "@/lib/site-settings";
import { BOX_QR_SOURCE, getBoxQrSettings } from "@/lib/box-qr/settings";

function makeCode(): string {
  return `BOX${randomBytes(4).toString("hex").toUpperCase()}`;
}

export type BoxQrGrantResult =
  | {
      ok: true;
      code: string;
      percentOff: number;
      expiresAt: string;
      alreadyHad: boolean;
    }
  | { ok: false; error: string };

/** Müşteriye paket QR ödülünü verir; kuponu sepete yazar. */
export async function grantBoxQrReward(
  siteId: string,
  customerId: string,
): Promise<BoxQrGrantResult> {
  const settings = await getSiteSettings(siteId);
  const cfg = getBoxQrSettings(settings);
  if (!cfg.enabled) {
    return { ok: false, error: "Paket QR kampanyası kapalı." };
  }

  const existing = await prisma.customerPromoGrant.findUnique({
    where: {
      siteId_customerId_source: { siteId, customerId, source: BOX_QR_SOURCE },
    },
  });
  if (existing) {
    const stillValid = existing.expiresAt.getTime() > Date.now();
    if (stillValid) {
      await applyCodeToCart(existing.code);
      return {
        ok: true,
        code: existing.code,
        percentOff: existing.percentOff,
        expiresAt: existing.expiresAt.toISOString(),
        alreadyHad: true,
      };
    }
    return { ok: false, error: "Bu ödülün süresi dolmuş. Yeni kampanyaları takip et." };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + cfg.validityDays);

  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.storeCampaign.findFirst({
      where: { siteId, code },
      select: { id: true },
    });
    if (!clash) break;
    code = makeCode();
  }

  const minCartMinor = cfg.minCartTry > 0 ? Math.round(cfg.minCartTry * 100) : null;

  await prisma.$transaction(async (tx) => {
    await tx.storeCampaign.create({
      data: {
        siteId,
        name: `Paket QR — %${cfg.discountPercent}`,
        code,
        type: "percent_off",
        percentOff: cfg.discountPercent,
        autoApply: false,
        firstOrderOnly: cfg.firstOrderOnly,
        minCartMinor,
        maxUses: 1,
        usedCount: 0,
        active: true,
        startsAt: new Date(),
        endsAt: expiresAt,
        description: `box_qr customer:${customerId}`,
      },
    });
    await tx.customerPromoGrant.create({
      data: {
        siteId,
        customerId,
        source: BOX_QR_SOURCE,
        code,
        percentOff: cfg.discountPercent,
        expiresAt,
      },
    });
  });

  await applyCodeToCart(code);

  return {
    ok: true,
    code,
    percentOff: cfg.discountPercent,
    expiresAt: expiresAt.toISOString(),
    alreadyHad: false,
  };
}

async function applyCodeToCart(code: string) {
  try {
    const session = await getCartSession();
    session.couponCode = code;
    await session.save();
  } catch (e) {
    console.error("[box-qr] cart coupon", e);
  }
}

export async function getCustomerBoxQrGrant(siteId: string, customerId: string) {
  return prisma.customerPromoGrant.findUnique({
    where: {
      siteId_customerId_source: { siteId, customerId, source: BOX_QR_SOURCE },
    },
  });
}
