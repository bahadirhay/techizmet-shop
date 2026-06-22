import { SocialPublishSettingsForm } from "@/components/admin/SocialPublishSettingsForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { socialPublishSecretsConfigured } from "@/lib/social-publish/settings";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";
import { parseSiteSettings } from "@/lib/site-settings";

export default async function SocialPublishIntegrationsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const sp = settings.socialPublish ?? {};
  const secrets = socialPublishSecretsConfigured(sp);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Bildirimler" }, { label: "Sosyal yayın API" }]}
        title="Sosyal medya otomatik yayın"
        description="Meta (Instagram), TikTok ve LinkedIn API jetonları. Ürün taslaklarından doğrudan veya zamanlanmış yayın."
      />

      <SocialPublishSettingsForm
        initial={{
          meta: { ...sp.meta, accessToken: "" },
          tiktok: { ...sp.tiktok, accessToken: "", refreshToken: "", clientSecret: "" },
          youtube: { ...sp.youtube, refreshToken: "", clientSecret: "" },
          linkedin: { ...sp.linkedin, accessToken: "" },
        }}
        secretsConfigured={secrets}
      />
    </div>
  );
}
