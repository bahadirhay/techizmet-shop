import Link from "next/link";
import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

function parseSettings(raw: string | null) {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function PaymentSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSettings(site?.settingsJson ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Ödeme entegrasyonları</h1>
      <p className="mt-1 text-sm text-zinc-500">
        PayTR ve iyzico API anahtarları; kapıda ödeme / havale. Ücretsiz kargo limiti için{" "}
        <Link href="/admin/settings/store" className="text-[var(--kn-brand)] underline">
          Kampanyalar → Ücretsiz kargo eşiği
        </Link>
        .
      </p>
      <div className="mt-6">
        <PaymentSettingsForm initial={settings as Parameters<typeof PaymentSettingsForm>[0]["initial"]} />
      </div>
    </div>
  );
}
