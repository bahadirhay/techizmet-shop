import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SeoAiSettingsForm } from "@/components/admin/SeoAiSettingsForm";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { parseSeoAiSettings } from "@/lib/admin/product-seo/ai-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function SeoAiSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = parseSeoAiSettings(settings.seoAi);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "SEO AI" }]}
        title="Ürün SEO — AI ayarları"
        description="Gemini, Claude veya OpenAI ile metin; fal.ai veya DALL·E ile blog görseli."
      />
      <SeoAiSettingsForm
        initial={{
          enabled: config.enabled,
          provider: config.provider,
          geminiApiKey: "",
          openaiApiKey: "",
          claudeApiKey: "",
          geminiModel: config.geminiModel,
          openaiModel: config.openaiModel,
          claudeModel: config.claudeModel,
          falApiKey: "",
          falImageModel: config.falImageModel,
          imageProvider: config.imageProvider,
          hasGeminiKey: Boolean(settings.seoAi?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim()),
          hasOpenaiKey: Boolean(settings.seoAi?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim()),
          hasClaudeKey: Boolean(settings.seoAi?.claudeApiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()),
          hasFalKey: Boolean(settings.seoAi?.falApiKey?.trim() || process.env.FAL_KEY?.trim()),
        }}
      />
    </div>
  );
}
