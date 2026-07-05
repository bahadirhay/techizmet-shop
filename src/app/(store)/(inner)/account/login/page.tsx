import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { MirrorAccountAuthFrame } from "@/components/store/MirrorAccountAuthFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { AccountLoginForm } from "@/components/store/AccountLoginForm";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getStoreLocale } from "@/lib/i18n/server";
import { MIRROR_ACCOUNT_BRIDGE_JS } from "@/lib/mirror-account-bridge";
import { resolveThemeShellAccountAuthContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery & { next?: string }>;
}) {
  const { next, ...query } = await searchParams;
  const returnTo = sanitizeAccountReturnPath(next);
  const session = await getCustomerSession();
  if (session.isLoggedIn) redirect(returnTo);

  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/account/login", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const content = await resolveThemeShellAccountAuthContent(site.id, locale, "login");
    if (!content) notFound();
    return (
      <ThemeShellCommerceView
        content={content}
        bridgeScripts={[MIRROR_ACCOUNT_BRIDGE_JS]}
      />
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorAccountAuthFrame mode="login" />;
  }

  return (
    <div className="kn-section kn-section--account">
      <AccountLoginForm />
    </div>
  );
}
