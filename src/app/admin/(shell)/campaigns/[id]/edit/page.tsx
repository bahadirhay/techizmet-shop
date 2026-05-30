import { notFound } from "next/navigation";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { campaignToForm } from "@/lib/admin/campaign-form";
import { loadCampaignScopeOptions } from "@/lib/admin/campaign-scope-options";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const [campaign, opts] = await Promise.all([
    prisma.storeCampaign.findFirst({ where: { id, siteId: auth.siteId } }),
    loadCampaignScopeOptions(auth.siteId),
  ]);
  if (!campaign) notFound();
  return <CampaignForm initial={campaignToForm(campaign)} {...opts} />;
}
