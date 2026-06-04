import { VisitorsList } from "@/components/admin/VisitorsList";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function VisitorsAdminPage() {
  await requireStaffPage();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ziyaretçiler</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Her satır bir ziyaretçi grubu (<code className="rounded bg-zinc-100 px-1">kn_vid</code>
          ). Detaya tıklayarak hangi sayfaları gezdiğini görün.
        </p>
      </div>
      <VisitorsList />
    </div>
  );
}
