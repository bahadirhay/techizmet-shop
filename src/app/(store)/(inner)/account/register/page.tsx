import { redirect } from "next/navigation";
import { MirrorAccountAuthFrame } from "@/components/store/MirrorAccountAuthFrame";
import { AccountRegisterForm } from "@/components/store/AccountRegisterForm";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function AccountRegisterPage({
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
    return <MirrorAccountAuthFrame mode="register" />;
  }

  return (
    <div className="kn-section kn-section--account">
      <AccountRegisterForm />
    </div>
  );
}
