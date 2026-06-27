import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { parseInvoiceEntryExcel } from "@/lib/finance/invoice-entry-excel";
import { syncKdvObligation } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { getTaxConfig } from "@/lib/finance/tax";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  const defaultDir = (form.get("direction") as string | null) ?? "outgoing";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Excel dosyası gerekli (.xlsx)" }, { status: 400 });
  }
  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return NextResponse.json({ error: "Yalnızca .xlsx / .xls dosyaları desteklenir" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const { rows, skipped, errors } = parseInvoiceEntryExcel(
    buffer,
    defaultDir === "incoming" ? "incoming" : "outgoing",
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: errors[0] ?? "İşlenebilir satır bulunamadı", parseErrors: errors, skipped },
      { status: 400 },
    );
  }

  // Dedup: check existing invoiceNo values to avoid duplicates
  const invoiceNos = rows.map((r) => r.invoiceNo).filter(Boolean);
  const existingNos = new Set<string>();
  if (invoiceNos.length > 0) {
    const existing = await prisma.invoiceEntry.findMany({
      where: { siteId: auth.siteId, invoiceNo: { in: invoiceNos } },
      select: { invoiceNo: true },
    });
    for (const e of existing) if (e.invoiceNo) existingNos.add(e.invoiceNo);
  }

  let created = 0;
  let duplicate = 0;
  const affectedMonths = new Set<string>();

  for (const row of rows) {
    if (row.invoiceNo && existingNos.has(row.invoiceNo)) {
      duplicate++;
      continue;
    }

    await prisma.invoiceEntry.create({
      data: {
        siteId: auth.siteId,
        direction: row.direction,
        invoiceDate: row.invoiceDate,
        invoiceNo: row.invoiceNo || null,
        counterparty: row.counterparty || null,
        netMinor: row.netMinor,
        kdvRate: row.kdvRate,
        kdvMinor: row.kdvMinor,
        description: row.description || null,
      },
    });
    created++;
    const y = row.invoiceDate.getUTCFullYear();
    const m = row.invoiceDate.getUTCMonth() + 1;
    affectedMonths.add(`${y}-${m}`);
  }

  // Sync KDV obligations for affected months
  if (affectedMonths.size > 0) {
    const site = await prisma.storeSite.findUnique({
      where: { id: auth.siteId },
      select: { settingsJson: true },
    });
    const config = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));

    const affectedYears = new Set<number>();
    const syncPromises: Promise<void>[] = [];
    for (const key of affectedMonths) {
      const [y, m] = key.split("-").map(Number) as [number, number];
      syncPromises.push(syncKdvObligation(auth.siteId, y, m));
      affectedYears.add(y);
    }
    await Promise.all(syncPromises);
    await Promise.all(
      [...affectedYears].map((y) => syncGeciciObligations(auth.siteId, y, config.incomeBrackets)),
    );
  }

  return NextResponse.json({
    created,
    duplicate,
    skipped,
    parseErrors: errors,
    message: `${created} fatura kaydedildi${duplicate > 0 ? `, ${duplicate} zaten var (atlandı)` : ""}${skipped > 0 ? `, ${skipped} satır okunamadı` : ""}.`,
  });
}
