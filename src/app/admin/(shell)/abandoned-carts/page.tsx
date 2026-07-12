import { AbandonedCartAutomationForm } from "@/components/admin/AbandonedCartAutomationForm";
import { AbandonedCartsClient } from "@/components/admin/AbandonedCartsClient";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AbandonedCartsAdminPage() {
  await requireStaffPage();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Terk edilen sepetler</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sepete ekleyip satın almayan ziyaretçiler. Otomatik e-posta dizisinin yanı sıra manuel
          e-posta veya WhatsApp hatırlatması da gönderebilirsiniz.{" "}
          <a href="/admin/analytics" className="font-medium underline">
            Analitik özeti
          </a>
        </p>
      </div>
      <AbandonedCartAutomationForm />
      <AbandonedCartsClient />
    </div>
  );
}
