import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import { syncKdvFromInvoiceDate } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { parseSiteSettings } from "@/lib/site-settings";
import { getTaxConfig } from "@/lib/finance/tax";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const entry = await prisma.invoiceEntry.findUnique({ where: { id } });
  if (!entry || entry.siteId !== auth.siteId) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  const invoiceDate = entry.invoiceDate;
  await prisma.invoiceEntry.delete({ where: { id } });

  // Silme sonrası senkronize et
  const year = invoiceDate.getUTCFullYear();
  const [site] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: auth.siteId }, select: { settingsJson: true } }),
    syncKdvFromInvoiceDate(auth.siteId, invoiceDate),
  ]);
  const config = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));
  await syncGeciciObligations(auth.siteId, year, config.incomeBrackets);

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const entry = await prisma.invoiceEntry.findUnique({ where: { id } });
  if (!entry || entry.siteId !== auth.siteId) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const updated = await prisma.invoiceEntry.update({
    where: { id },
    data: {
      ...(body.netMinor !== undefined && { netMinor: Math.round(parseFloat(String(body.netMinor))) }),
      ...(body.kdvRate !== undefined && { kdvRate: parseInt(String(body.kdvRate), 10) }),
      ...(body.kdvMinor !== undefined && { kdvMinor: Math.round(parseFloat(String(body.kdvMinor))) }),
      ...(body.invoiceNo !== undefined && { invoiceNo: (body.invoiceNo as string)?.trim() || null }),
      ...(body.counterparty !== undefined && { counterparty: (body.counterparty as string)?.trim() || null }),
      ...(body.description !== undefined && { description: (body.description as string)?.trim() || null }),
      ...(body.direction !== undefined && { direction: body.direction as string }),
      ...(body.invoiceDate !== undefined && { invoiceDate: new Date(body.invoiceDate as string) }),
    },
  });

  // Güncelleme sonrası senkronize et
  const year = updated.invoiceDate.getUTCFullYear();
  const [site] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: auth.siteId }, select: { settingsJson: true } }),
    syncKdvFromInvoiceDate(auth.siteId, updated.invoiceDate),
  ]);
  const config = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));
  await syncGeciciObligations(auth.siteId, year, config.incomeBrackets);

  return NextResponse.json({
    entry: { ...updated, invoiceDate: updated.invoiceDate.toISOString(), createdAt: updated.createdAt.toISOString() },
  });
}
