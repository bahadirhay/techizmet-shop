import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReviewsModerationPanel } from "@/components/admin/ReviewsModerationPanel";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AdminReviewsPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        title="Ürün Yorumları"
        description="Müşteri yorumlarını onaylayın, düzenleyin, silin veya manuel ekleyin. Onaylı yorumlar ürün sayfasında yıldız (AggregateRating) olarak görünür ve Google'da zengin sonuç sağlar."
      />
      <ReviewsModerationPanel />
    </div>
  );
}
