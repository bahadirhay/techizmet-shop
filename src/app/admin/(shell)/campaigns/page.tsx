import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTry } from "@/lib/admin/money";
import { campaignTypeLabel, parseCampaignScope, summarizeCampaignDetail } from "@/lib/campaign-engine";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function CampaignsPage() {
  const auth = await requireStaffPage();
  const campaigns =
    typeof prisma.storeCampaign?.findMany === "function"
      ? await prisma.storeCampaign.findMany({
          where: { siteId: auth.siteId },
          orderBy: { createdAt: "desc" },
        })
      : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kampanyalar</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Kupon, otomatik kampanya, kategori kapsamı, 3 al 2 öde ve ücretsiz kargo
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white"
        >
          + Yeni kampanya
        </Link>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-zinc-500">
            <th className="py-2">Kampanya</th>
            <th>Kod</th>
            <th>Tür</th>
            <th>Detay</th>
            <th>Kapsam</th>
            <th>Durum</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const scope = parseCampaignScope(c.scopeJson);
            const scopeParts: string[] = [];
            if (scope?.productIds?.length) scopeParts.push(`${scope.productIds.length} ürün`);
            if (scope?.categoryIds?.length) scopeParts.push(`${scope.categoryIds.length} kat.`);
            if (scope?.collectionIds?.length) scopeParts.push(`${scope.collectionIds.length} kol.`);
            if (scope?.brandIds?.length) scopeParts.push(`${scope.brandIds.length} marka`);
            return (
              <tr key={c.id} className="border-b">
                <td className="py-2 font-medium">
                  {c.name}
                  {c.autoApply ? (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                      Otomatik
                    </span>
                  ) : null}
                </td>
                <td className="font-mono text-xs">{c.autoApply ? "—" : (c.code ?? "—")}</td>
                <td>{campaignTypeLabel(c.type)}</td>
                <td className="text-zinc-600">
                  {summarizeCampaignDetail(c as Parameters<typeof summarizeCampaignDetail>[0])}
                  {c.minCartMinor ? ` · min ${formatTry(c.minCartMinor)}` : null}
                </td>
                <td className="text-zinc-500">{scopeParts.length ? scopeParts.join(", ") : "Tümü"}</td>
                <td>{c.active ? "Aktif" : "Pasif"}</td>
                <td>
                  <Link href={`/admin/campaigns/${c.id}/edit`} className="text-[var(--kn-brand)]">
                    Düzenle
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {campaigns.length === 0 ? (
        <p className="mt-8 text-zinc-500">Henüz kampanya yok. Kupon veya otomatik kampanya ekleyin.</p>
      ) : null}
    </div>
  );
}
