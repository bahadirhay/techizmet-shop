import { ThemeHomepageForm } from "@/components/admin/ThemeHomepageForm";
import { prisma } from "@/lib/prisma";
import { getHomepageMode, parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ThemePage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const mode = getHomepageMode(settings);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Tema & Vitrin Modu</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Şu an ana sayfa:{" "}
        <strong>{mode === "mirror" ? "Techizmet Shop orijinal (mirror HTML)" : "CMS blokları"}</strong>
      </p>
      <div className="mt-6">
        <ThemeHomepageForm initial={settings} themeId={site?.themeId ?? "techizmet-shop"} />
      </div>
    </div>
  );
}
