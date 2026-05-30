import Link from "next/link";
import { MirrorCheckoutSuccessFrame } from "@/components/store/MirrorCheckoutSuccessFrame";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; account?: string }>;
}) {
  const { order: orderNumber, account } = await searchParams;
  const accountCreated = account === "1";
  const session = await getCustomerSession();
  const loggedIn = Boolean(session.isLoggedIn);

  const site = await getDefaultSite();
  let paid = false;
  if (orderNumber) {
    const row = await prisma.storeOrder.findFirst({
      where: { siteId: site.id, orderNumber },
      select: { paymentStatus: true, paymentMethod: true },
    });
    paid = row?.paymentStatus === "paid" || row?.paymentMethod !== "card";
  }

  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    return (
      <MirrorCheckoutSuccessFrame
        orderNumber={orderNumber}
        accountCreated={accountCreated}
        paid={paid}
        loggedIn={loggedIn}
      />
    );
  }

  return (
    <div className="kn-section kn-checkout-success">
      <h1>{paid ? "Siparişiniz alındı" : "Ödeme işleniyor"}</h1>
      {orderNumber ? (
        <p className="kn-checkout-success__order">
          Sipariş numaranız: <strong>{orderNumber}</strong>
        </p>
      ) : null}
      <p>
        {paid
          ? "Onay e-postası adresinize gönderildi (e-posta ayarlıysa)."
          : "Kart ödemesi onaylandığında e-posta gönderilecektir."}
      </p>
      {accountCreated ? (
        <p className="kn-checkout-success__account">
          Hesabınız oluşturuldu ve giriş yaptınız. Siparişlerinizi{" "}
          <Link href="/account">hesabım</Link> sayfasından takip edebilirsiniz.
        </p>
      ) : null}
      <div className="kn-checkout-success__actions">
        {orderNumber ? (
          <Link
            href={`/orders/track?order=${encodeURIComponent(orderNumber)}`}
            className="kn-btn kn-btn--primary"
          >
            Siparişi takip et
          </Link>
        ) : null}
        {accountCreated || loggedIn ? (
          <Link href="/account" className="kn-btn kn-btn--outline">
            Hesabım
          </Link>
        ) : (
          <Link href="/account/register" className="kn-btn kn-btn--outline">
            Hesap oluştur
          </Link>
        )}
        <Link href="/collections/all" className="kn-btn kn-btn--outline">
          Alışverişe devam
        </Link>
      </div>
    </div>
  );
}
