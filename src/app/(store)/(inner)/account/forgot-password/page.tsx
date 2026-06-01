import { MirrorAccountAuthFrame } from "@/components/store/MirrorAccountAuthFrame";
import { AccountForgotPasswordForm } from "@/components/store/AccountForgotPasswordForm";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";

export default async function AccountForgotPasswordPage() {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    return <MirrorAccountAuthFrame mode="forgot-password" />;
  }

  return (
    <div className="kn-section kn-section--account">
      <AccountForgotPasswordForm />
    </div>
  );
}
