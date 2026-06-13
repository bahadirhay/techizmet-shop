import { WhatsappAdminClient } from "@/components/admin/WhatsappAdminClient";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";
import { getWhatsAppConfig } from "@/lib/whatsapp-settings";

export default async function WhatsappAdminPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const wa = getWhatsAppConfig(settings);

  const [initialLeads, initialCounts, initialBotNodes] = await Promise.all([
    prisma.whatsAppLead.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.whatsAppLead.groupBy({
      by: ["status"],
      where: { siteId: auth.siteId },
      _count: { _all: true },
    }),
    prisma.whatsAppBotNode.findMany({
      where: { siteId: auth.siteId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Numara, bot asistan ve gelen kutusu. Her WhatsApp yönlendirmesinde mesaja{" "}
          <strong>Ref</strong> eklenir.
        </p>
      </div>
      <WhatsappAdminClient
        initialWhatsapp={settings.whatsapp ?? {}}
        resolvedNumber={wa.number}
        initialLeads={initialLeads}
        initialCounts={initialCounts}
        initialBotNodes={initialBotNodes}
      />
    </div>
  );
}
