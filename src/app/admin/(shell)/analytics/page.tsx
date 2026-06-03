import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AnalyticsAdminPage() {
  await requireStaffPage();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ziyaretçi & sepet analitiği</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Ürün görüntüleme, sepet terki ve dönüşüm olayları. Çerez onay kayıtları:{" "}
          <a href="/admin/settings/cookie-consents" className="underline">
            Çerez Onay Kayıtları
          </a>
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
