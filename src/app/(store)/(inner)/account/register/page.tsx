import { redirect } from "next/navigation";
import { AccountRegisterForm } from "@/components/store/AccountRegisterForm";
import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function AccountRegisterPage() {
  const session = await getCustomerSession();
  if (session.isLoggedIn) redirect("/account");

  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    redirect("/?account=create");
  }

  return (
    <div className="kn-section kn-section--account">
      <AccountRegisterForm />
    </div>
  );
}
