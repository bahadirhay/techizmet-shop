import { redirect } from "next/navigation";
import { PaytrCheckout } from "@/components/cart/PaytrCheckout";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function CheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; failed?: string; token?: string }>;
}) {
  const { order, failed, token } = await searchParams;
  if (!order?.trim() || !token?.trim()) redirect("/checkout");
  const homepageMode = await getStoreHomepageMode();
  const pay = (
    <PaytrCheckout
      orderNumber={order.trim()}
      paymentToken={token.trim()}
      failed={failed === "1"}
    />
  );

  if (homepageMode === "mirror") {
    return (
      <div className="kn-checkout-embed-root kn-paytr-page">
        <CheckoutEmbedStyles />
        {pay}
      </div>
    );
  }

  return pay;
}
