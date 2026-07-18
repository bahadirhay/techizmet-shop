import { redirect } from "next/navigation";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";

/** Eski / yanlış URL'ler → /admin/integrations?platform=… */
const ALIASES: Record<string, string> = {
  amazon: "amazon_tr",
  "amazon-tr": "amazon_tr",
  amazontr: "amazon_tr",
  ty: "trendyol",
  hb: "hepsiburada",
};

export default async function MarketplacePlatformRedirectPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform: raw } = await params;
  const key = raw.trim().toLowerCase();
  const aliased = ALIASES[key] ?? key;
  const known = MARKETPLACE_PLATFORMS.some((p) => p.id === aliased);
  if (!known) {
    redirect("/admin/integrations");
  }
  redirect(`/admin/integrations?platform=${aliased}`);
}
