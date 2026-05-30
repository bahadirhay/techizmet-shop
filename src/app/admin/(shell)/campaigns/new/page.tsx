import { CampaignForm } from "@/components/admin/CampaignForm";
import { emptyCampaignForm } from "@/lib/admin/campaign-form";
import { loadCampaignScopeOptions } from "@/lib/admin/campaign-scope-options";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function NewCampaignPage() {
  const auth = await requireStaffPage();
  const opts = await loadCampaignScopeOptions(auth.siteId);
  return <CampaignForm initial={emptyCampaignForm()} {...opts} />;
}
