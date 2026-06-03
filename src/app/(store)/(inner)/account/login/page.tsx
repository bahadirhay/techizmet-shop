import { redirect } from "next/navigation";
import { MirrorAccountAuthFrame } from "@/components/store/MirrorAccountAuthFrame";
import { AccountLoginForm } from "@/components/store/AccountLoginForm";
import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function AccountLoginPage() {
  const session = await getCustomerSession();
  if (session.isLoggedIn) redirect("/account");

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
