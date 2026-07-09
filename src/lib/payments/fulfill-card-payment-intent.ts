import "server-only";

import { recordPurchaseEvent } from "@/lib/analytics/events";
import { createOrderFromCart } from "@/lib/cart/service";
import { clearCartSession } from "@/lib/cart/session";
import { createAccountAfterOrder } from "@/lib/checkout/create-account-after-order";
import { saveCheckoutAddressToCustomer } from "@/lib/checkout/save-address";
import { sendOrderConfirmationBundle } from "@/lib/email/send-order-notifications";
import {
  deleteCardCheckoutIntent,
  loadCardCheckoutIntent,
} from "@/lib/payments/card-checkout-intent";

export async function fulfillCardPaymentIntent(
  siteId: string,
  reference: string,
): Promise<{ orderId: string; orderNumber: string } | null> {
  const loaded = await loadCardCheckoutIntent(siteId, reference);
  if (!loaded) return null;

  const { intent, payload } = loaded;

  const result = await createOrderFromCart({
    siteId,
    session: payload.session,
    customerId: payload.customerId,
    customer: payload.customer,
    carrierId: payload.carrierId,
    rateId: payload.rateId,
    paymentMethod: "card",
    guestCheckout: true,
    visitorKey: intent.visitorKey,
    cardPaymentConfirmed: true,
  });

  await clearCartSession();

  let customerId = result.customerId;
  if (payload.createAccount && payload.accountPassword && payload.accountPassword.length >= 6) {
    const acc = await createAccountAfterOrder({
      siteId,
      customerId: result.customerId,
      email: payload.customer.email,
      password: payload.accountPassword,
      firstName: payload.customer.firstName,
      lastName: payload.customer.lastName,
      phone: payload.customer.phone,
      address: {
        city: payload.customer.address.city,
        district: payload.customer.address.district,
        line1: payload.customer.address.line1,
        postalCode: payload.customer.address.postalCode,
      },
    });
    if (acc.ok && acc.loggedIn && result.customerId) customerId = result.customerId;
  }

  if (payload.guestLoggedIn && customerId && payload.saveAddress) {
    await saveCheckoutAddressToCustomer({
      customerId,
      firstName: payload.customer.firstName,
      lastName: payload.customer.lastName,
      phone: payload.customer.phone,
      city: payload.customer.address.city,
      district: payload.customer.address.district,
      line1: payload.customer.address.line1,
      postalCode: payload.customer.address.postalCode,
    }).catch((e) => console.error("[checkout saveAddress]", e));
  }

  await sendOrderConfirmationBundle(result.orderId).catch((e) => console.error("[notify]", e));

  try {
    const { recordOrderFinanceOnPayment } = await import("@/lib/finance/order-posting");
    await recordOrderFinanceOnPayment(siteId, result.orderId);
  } catch (e) {
    console.error("[finance]", e);
  }

  try {
    const { recordStreetFoodContributionOnPayment } = await import("@/lib/street-food-fund/contribution");
    await recordStreetFoodContributionOnPayment(siteId, result.orderId);
  } catch (e) {
    console.error("[street-food-fund]", e);
  }

  try {
    await recordPurchaseEvent({
      siteId,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      valueMinor: intent.totalMinor,
      paymentMethod: "card",
      visitorKey: intent.visitorKey,
      customerId,
    });
  } catch (e) {
    console.error("[analytics]", e);
  }

  await deleteCardCheckoutIntent(intent.id);

  return result;
}

export async function abandonCardPaymentIntent(siteId: string, reference: string) {
  const loaded = await loadCardCheckoutIntent(siteId, reference);
  if (!loaded) return;
  await deleteCardCheckoutIntent(loaded.intent.id);
}
