import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InvoiceLineTemplatesManager } from "@/components/admin/InvoiceLineTemplatesManager";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvoiceLinesPage() {
  const auth = await requireStaffPage();

  const templates = await prisma.financeInvoiceLineTemplate.findMany({
    where: { siteId: auth.siteId, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön Muhasebe", href: "/admin/finance" }, { label: "Fatura Kalemleri" }]}
        title="Fatura Kalemleri"
        description="Sık kullandığınız hizmet ve ürün kalemlerini kaydedin. Fatura keserken açıklama alanından seçilebilir."
      />
      <InvoiceLineTemplatesManager
        initial={templates.map((t) => ({
          id: t.id,
          description: t.description,
          unit: t.unit,
          unitPriceTl: Number(t.unitPriceTl),
          vatRate: t.vatRate,
          notes: t.notes,
          sortOrder: t.sortOrder,
        }))}
      />
    </div>
  );
}
