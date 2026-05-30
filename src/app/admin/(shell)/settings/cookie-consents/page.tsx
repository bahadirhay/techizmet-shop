import { CookieConsentLogs } from "@/components/admin/CookieConsentLogs";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function CookieConsentsAdminPage() {
  await requireStaffPage();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Çerez onay logları</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Ziyaretçilerin çerez tercih kayıtları (son 200). Ayarlar:{" "}
          <a href="/admin/settings/navigation" className="underline">
            Footer & çerez ayarları
          </a>
        </p>
      </div>
      <CookieConsentLogs />
    </div>
  );
}
