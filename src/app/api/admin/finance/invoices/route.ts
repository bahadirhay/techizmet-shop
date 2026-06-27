import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import { calcKdv } from "@/lib/finance/kdv";
import { syncKdvFromInvoiceDate } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { parseSiteSettings } from "@/lib/site-settings";
import { getTaxConfig } from "@/lib/finance/tax";

function serializeEntry(e: {
  id: string; direction: string; invoiceDate: Date; invoiceNo: string | null;
  counterparty: string | null; netMinor: number; kdvRate: number; kdvMinor: number;
  description: string | null; createdAt: Date;
}) {
  return { ...e, invoiceDate: e.invoiceDate.toISOString(), createdAt: e.createdAt.toISOString() };
}

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getUTCFullYear()), 10);
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const entries = await prisma.invoiceEntry.findMany({
    where: { siteId: auth.siteId, invoiceDate: { gte: start, lt: end } },
    orderBy: { invoiceDate: "desc" },
  });
  return NextResponse.json({ entries: entries.map(serializeEntry) });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as {
    direction?: string; invoiceDate?: string; invoiceNo?: string; counterparty?: string;
    netMinor?: unknown; kdvRate?: unknown; kdvMinor?: unknown; description?: string;
  };
  const netMinor = Math.round(parseFloat(String(body.netMinor ?? 0)));
  const kdvRate = parseInt(String(body.kdvRate ?? 20), 10);
  const kdvMinor = body.kdvMinor !== undefined
    ? Math.round(parseFloat(String(body.kdvMinor)))
    : calcKdv(netMinor, kdvRate as 1 | 10 | 20);
  const invoiceDate = new Date(body.invoiceDate ?? new Date().toISOString());
  const entry = await prisma.invoiceEntry.create({
    data: {
      siteId: auth.siteId,
      direction: body.direction === "incoming" ? "incoming" : "outgoing",
      invoiceDate,
      invoiceNo: body.invoiceNo?.trim() || null,
      counterparty: body.counterparty?.trim() || null,
      netMinor,
      kdvRate,
      kdvMinor,
      description: body.description?.trim() || null,
    },
  });

  // Senkronize: KDV ve geçici vergi yükümlülüklerini güncelle
  const year = invoiceDate.getUTCFullYear();
  const [site] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: auth.siteId }, select: { settingsJson: true } }),
    syncKdvFromInvoiceDate(auth.siteId, invoiceDate),
  ]);
  const config = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));
  await syncGeciciObligations(auth.siteId, year, config.incomeBrackets);

  return NextResponse.json({ entry: serializeEntry(entry) }, { status: 201 });
}
