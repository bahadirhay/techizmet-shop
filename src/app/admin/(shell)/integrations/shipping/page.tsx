import { headers } from "next/headers";
import Link from "next/link";
import { GeliverSettingsForm } from "@/components/admin/GeliverSettingsForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { geliverShipmentReady, resolveGeliverConfig } from "@/lib/shipping/geliver/settings";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";
import { parseSiteSettings } from "@/lib/site-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";

export default async function ShippingIntegrationsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const siteUrl = getPublicSiteUrl();
  const config = resolveGeliverConfig(settings, siteUrl);
  const geliver = settings.geliver ?? {};
  const tokenConfigured = Boolean(config.apiToken);
  const shipmentReady = geliverShipmentReady(settings, siteUrl);

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  const webhookUrl = host ? `${proto}://${host}/api/webhooks/geliver` : "/api/webhooks/geliver";

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Kargo & Lojistik" }, { label: "Geliver" }]}
        title="Geliver kargo entegrasyonu"
        description="Yalnızca API token gerekir. Gönderici adresi mağaza ayarlarından otomatik oluşturulur."
        actions={
          <Link href="/admin/shipping" className="text-sm text-[var(--kn-brand)] underline">
            Kargo firmaları →
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <span
          className={`rounded-full px-3 py-1 ${tokenConfigured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}
        >
          Token: {tokenConfigured ? "tanımlı" : "eksik"}
        </span>
        <span
          className={`rounded-full px-3 py-1 ${shipmentReady ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700"}`}
        >
          Gönderi: {shipmentReady ? "hazır" : "gönderici adresi gerekli"}
        </span>
      </div>

      <GeliverSettingsForm
        initialGeliver={{
          ...geliver,
          apiToken: "",
          webhookSecret: "",
        }}
        tokenConfigured={tokenConfigured}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
