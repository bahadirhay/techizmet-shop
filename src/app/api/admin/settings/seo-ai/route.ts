import { NextResponse } from "next/server";
import { parseSeoAiSettings } from "@/lib/admin/product-seo/ai-settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function toClientState(settings: SiteSettings["seoAi"], resolved: ReturnType<typeof parseSeoAiSettings>) {
  return {
    enabled: resolved.enabled,
    provider: resolved.provider,
    geminiModel: resolved.geminiModel,
    openaiModel: resolved.openaiModel,
    claudeModel: resolved.claudeModel,
    hasGeminiKey: Boolean(settings?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim()),
    hasOpenaiKey: Boolean(settings?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim()),
    hasClaudeKey: Boolean(settings?.claudeApiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()),
  };
}

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const resolved = parseSeoAiSettings(settings.seoAi);

  return NextResponse.json({
    seoAi: {
      ...toClientState(settings.seoAi, resolved),
      geminiApiKey: "",
      openaiApiKey: "",
      claudeApiKey: "",
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as { seoAi?: SiteSettings["seoAi"] };
  const current = parseSiteSettings(site.settingsJson);
  const patch = body.seoAi ?? {};

  const nextSeoAi: SiteSettings["seoAi"] = { ...current.seoAi, ...patch };
  if (patch.geminiApiKey === "") delete nextSeoAi?.geminiApiKey;
  if (patch.openaiApiKey === "") delete nextSeoAi?.openaiApiKey;
  if (patch.claudeApiKey === "") delete nextSeoAi?.claudeApiKey;

  const next = mergeSiteSettings(current, { seoAi: nextSeoAi });
  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  const resolved = parseSeoAiSettings(next.seoAi);
  return NextResponse.json({
    ok: true,
    seoAi: {
      ...toClientState(next.seoAi, resolved),
      geminiApiKey: "",
      openaiApiKey: "",
      claudeApiKey: "",
    },
  });
}
