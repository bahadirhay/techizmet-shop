import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GoogleRankingPanel } from "@/components/admin/GoogleRankingPanel";
import { parseGscSettings, toClientGscState } from "@/lib/admin/gsc/settings";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { getSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function GoogleRankingPage() {
  const auth = await requireStaffPage();
  const settings = await getSiteSettings(auth.siteId);
  const gsc = toClientGscState(parseGscSettings(settings.gsc));

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "Google Sıralama" }]}
        title="Google Sıralama"
        description="Köpek Ödül Maması, Ödül maması ve Doğal Köpek Ödül Maması — landing sağlığı + Search Console sırası."
      />
      <div className="mt-6">
        <GoogleRankingPanel gscInitial={gsc} />
      </div>
    </div>
  );
}
