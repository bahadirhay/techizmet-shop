import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BoxQrCampaignPanel } from "@/components/admin/BoxQrCampaignPanel";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AdminBoxQrPage() {
  await requireStaffPage();
  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Pazarlama", href: "/admin/campaigns" },
          { label: "Paket QR (/box)" },
        ]}
        title="Paket QR kampanyası"
        description="Kutudaki QR kodu /box sayfasına gider. Metin, indirim oranı ve süre buradan yönetilir."
      />
      <BoxQrCampaignPanel />
    </div>
  );
}
