import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SeoAiSettingsForm } from "@/components/admin/SeoAiSettingsForm";
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
        breadcrumb={[
          { label: "Ayarlar", href: "/admin/settings/seo" },
          { label: "SEO AI" },
        ]}
        title="Ürün SEO — AI ayarları"
        description="Gemini, Claude veya OpenAI ile ürün açıklaması ve SEO metni üretimi."
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
          hasGeminiKey: Boolean(settings.seoAi?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim()),
          hasOpenaiKey: Boolean(settings.seoAi?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim()),
          hasClaudeKey: Boolean(settings.seoAi?.claudeApiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()),
        }}
      />
    </div>
  );
}
