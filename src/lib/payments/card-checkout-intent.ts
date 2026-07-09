import "server-only";

import type { CartSessionData } from "@/lib/cart/types";
import { generateOrderNumber } from "@/lib/admin/order-number";
import { prisma } from "@/lib/prisma";

const INTENT_TTL_MS = 30 * 60 * 1000;

export type CardCheckoutIntentPayload = {
  session: CartSessionData;
  customerId: string | null;
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
      firstName?: string;
      lastName?: string;
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
  createAccount?: boolean;
  accountPassword?: string;
  saveAddress?: boolean;
  guestLoggedIn?: boolean;
};

export function generateCardPaymentReference(): string {
  return generateOrderNumber("PAY");
}

export async function createCardCheckoutIntent(params: {
  siteId: string;
  reference: string;
  payload: CardCheckoutIntentPayload;
  totalMinor: number;
  customerId?: string | null;
  visitorKey?: string | null;
}) {
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);
  return prisma.storeCardPaymentIntent.create({
    data: {
      siteId: params.siteId,
      reference: params.reference,
      payloadJson: JSON.stringify(params.payload),
      totalMinor: params.totalMinor,
      customerId: params.customerId ?? null,
      visitorKey: params.visitorKey?.trim() || null,
      expiresAt,
    },
  });
}

export async function loadCardCheckoutIntent(siteId: string, reference: string) {
  const intent = await prisma.storeCardPaymentIntent.findFirst({
    where: { siteId, reference },
  });
  if (!intent) return null;
  if (intent.expiresAt.getTime() < Date.now()) {
    await prisma.storeCardPaymentIntent.delete({ where: { id: intent.id } }).catch(() => {});
    return null;
  }
  let payload: CardCheckoutIntentPayload;
  try {
    payload = JSON.parse(intent.payloadJson) as CardCheckoutIntentPayload;
  } catch {
    return null;
  }
  return { intent, payload };
}

export async function deleteCardCheckoutIntent(intentId: string) {
  await prisma.storeCardPaymentIntent.delete({ where: { id: intentId } }).catch(() => {});
}

export async function setCardCheckoutIntentIyzicoToken(intentId: string, token: string) {
  await prisma.storeCardPaymentIntent.update({
    where: { id: intentId },
    data: { iyzicoToken: token },
  });
}
