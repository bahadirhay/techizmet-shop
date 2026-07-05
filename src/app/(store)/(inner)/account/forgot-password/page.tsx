import { notFound } from "next/navigation";
import { MirrorAccountAuthFrame } from "@/components/store/MirrorAccountAuthFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { AccountForgotPasswordForm } from "@/components/store/AccountForgotPasswordForm";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getStoreLocale } from "@/lib/i18n/server";
import { MIRROR_ACCOUNT_BRIDGE_JS } from "@/lib/mirror-account-bridge";
import { resolveThemeShellAccountAuthContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function AccountForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const query = await searchParams;
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const themeShellLive = process.env.THEME_SHELL_PILOT_LIVE === "1";
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/account/forgot-password", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const content = await resolveThemeShellAccountAuthContent(site.id, locale, "forgot-password");
    if (!content) notFound();
    return (
      <ThemeShellCommerceView
        content={content}
        bridgeScripts={[MIRROR_ACCOUNT_BRIDGE_JS]}
      />
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorAccountAuthFrame mode="forgot-password" />;
  }

  return (
    <div className="kn-section kn-section--account">
      <AccountForgotPasswordForm />
    </div>
  );
}
