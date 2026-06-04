import { VisitorDetail } from "@/components/admin/VisitorDetail";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function VisitorDetailPage({
  params,
}: {
  params: Promise<{ visitorKey: string }>;
}) {
  await requireStaffPage();
  const { visitorKey } = await params;

  return <VisitorDetail visitorKey={decodeURIComponent(visitorKey)} />;
}
