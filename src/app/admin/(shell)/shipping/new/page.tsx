import Link from "next/link";
import { redirect } from "next/navigation";
import { ShippingCarrierForm } from "@/components/admin/ShippingCarrierForm";
import { emptyCarrierForm } from "@/lib/admin/shipping-form";
import { SHIPPING_CARRIER_PRESETS } from "@/lib/admin/marketplace-platforms";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function NewShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const auth = await requireStaffPage();
  const { preset: presetCode } = await searchParams;

  // HepsiJet zaten varsa "yeni" yerine düzenleme sayfasına git (unique code çakışması).
  if (presetCode === "hepsijet") {
    const existing = await prisma.shippingCarrier.findFirst({
      where: { siteId: auth.siteId, code: "hepsijet" },
      select: { id: true },
    });
    if (existing) redirect(`/admin/shipping/${existing.id}`);
  }

  const preset = SHIPPING_CARRIER_PRESETS.find((p) => p.code === presetCode);
  const initial = emptyCarrierForm(
    preset
      ? {
          code: preset.code,
          name: preset.name,
          trackingUrlTemplate: preset.trackingUrlTemplate,
          provider: preset.code === "hepsijet" ? "hepsijet" : "manual",
        }
      : undefined,
  );

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        Hızlı başlangıç:{" "}
        {SHIPPING_CARRIER_PRESETS.map((p) => (
          <Link
            key={p.code}
            href={`/admin/shipping/new?preset=${p.code}`}
            className="mr-2 text-[var(--kn-brand)] underline"
          >
            {p.name}
          </Link>
        ))}
      </p>
      <ShippingCarrierForm initial={initial} initialRates={[]} />
    </div>
  );
}
