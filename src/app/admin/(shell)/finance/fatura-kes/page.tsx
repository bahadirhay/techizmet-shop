import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManuelFaturaKes } from "@/components/admin/ManuelFaturaKes";
import { TopluFatura } from "@/components/admin/TopluFatura";
import { orderInvoicePendingWhere } from "@/lib/admin/order-invoice-workflow";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function FaturaKesPage() {
  const auth = await requireStaffPage();

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_STORE_URL ??
    "https://sizin-domain.com"
  ).replace(/\/$/, "");

  const [site, pendingCount] = await Promise.all([
    getDefaultSite(),
    prisma.storeOrder.count({ where: { siteId: auth.siteId, ...orderInvoicePendingWhere() } }),
  ]);
  const settings = await getSiteSettings(site.id);
  const efatura = settings.efatura ?? {};

  return (
    <div className="space-y-10">
      {/* Toplu sipariş faturalama */}
      <div>
        <AdminPageHeader
          breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Fatura Kes" }]}
          title="Fatura Kes"
          description="Toplu sipariş faturalama ve tek seferlik manuel fatura."
        />

        <div className="mb-2">
          <h2 className="text-base font-semibold text-zinc-800">Toplu Sipariş Faturalama</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kargoya verilmiş ama faturası kesilmemiş siparişlerin tamamını tek tıkla faturala.
            GİB e-Arşiv, imzalama ve pazaryeri yükleme otomatik yapılır.
          </p>
        </div>
        <TopluFatura pendingCount={pendingCount} />
      </div>

      {/* Manuel / servis faturası */}
      <div>
        <div className="mb-4 border-t border-zinc-200 pt-8">
          <h2 className="text-base font-semibold text-zinc-800">Manuel Fatura Kes (Servis / Danışmanlık vb.)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sipariş dışı faturalar için: hizmet bedeli, danışmanlık, kira vb. GİB e-Arşiv'e gönderilir.
          </p>
        </div>
        <ManuelFaturaKes
          siteUrl={siteUrl}
          sellerTitle={efatura.sellerTitle ?? site.name}
          sellerTaxId={efatura.sellerTaxId ?? ""}
          sellerTaxOffice={efatura.sellerTaxOffice ?? ""}
        />
      </div>
    </div>
  );
}
