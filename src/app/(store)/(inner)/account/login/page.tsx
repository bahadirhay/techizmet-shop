import { redirect } from "next/navigation";
import { MirrorAccountAuthFrame } from "@/components/store/MirrorAccountAuthFrame";
import { AccountLoginForm } from "@/components/store/AccountLoginForm";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const returnTo = sanitizeAccountReturnPath(next);
  const session = await getCustomerSession();
  if (session.isLoggedIn) redirect(returnTo);

  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    return <MirrorAccountAuthFrame mode="login" />;
  }

  return (
    <div className="kn-section kn-section--account">
      <AccountLoginForm />
    </div>
  );
}
