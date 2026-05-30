import { redirect } from "next/navigation";
import { PaytrCheckout } from "@/components/cart/PaytrCheckout";

export default async function CheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; failed?: string }>;
}) {
  const { order, failed } = await searchParams;
  if (!order?.trim()) redirect("/checkout");
  return (
    <PaytrCheckout orderNumber={order.trim()} failed={failed === "1"} />
  );
}
