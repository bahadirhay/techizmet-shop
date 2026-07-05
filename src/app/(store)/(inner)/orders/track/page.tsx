import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MirrorOrderTrackFrame } from "@/components/store/MirrorOrderTrackFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { OrderTrackForm } from "@/components/store/OrderTrackForm";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { getStoreLocale } from "@/lib/i18n/server";
import { ORDER_TRACK_EMBED_BRIDGE_JS } from "@/lib/mirror-order-track-page";
import { resolveThemeShellOrderTrackContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

type Props = {
  searchParams: Promise<ThemeShellPilotQuery & { order?: string }>;
};

export default async function OrderTrackPage({ searchParams }: Props) {
  const { order, ...query } = await searchParams;
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/orders/track", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const content = resolveThemeShellOrderTrackContent(locale, order);
    if (!content) notFound();
    return (
      <ThemeShellCommerceView
        content={content}
        bridgeScripts={[ORDER_TRACK_EMBED_BRIDGE_JS]}
      />
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorOrderTrackFrame initialOrder={order} />;
  }

  return (
    <div className="kn-section">
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <OrderTrackForm />
      </Suspense>
    </div>
  );
}
