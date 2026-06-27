/**
 * Google Sheets / harici entegrasyon webhook endpoint.
 * Authorization: Bearer <webhookToken>
 * Body: { direction, invoiceDate, invoiceNo?, counterparty?, netTl, kdvRate, kdvMinor?, description? }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncKdvFromInvoiceDate } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { getTaxConfig } from "@/lib/finance/tax";
import { parseSiteSettings } from "@/lib/site-settings";
import { calcKdv } from "@/lib/finance/kdv";

type Body = {
  siteId?: string;
  direction?: string;
  invoiceDate?: string;
  invoiceNo?: string;
  counterparty?: string;
  netTl?: number;
  kdvRate?: number;
  kdvMinor?: number;
  description?: string;
};

function normalizeKdvRate(rate: number): 1 | 10 | 20 {
  if (rate <= 2) return 1;
  if (rate <= 15) return 10;
  return 20;
}

export async function POST(req: Request) {
  // Auth via Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Authorization header gerekli" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });

  // Find site by webhook token
  const allSites = await prisma.storeSite.findMany({
    select: { id: true, settingsJson: true },
  });
  const site = allSites.find((s) => {
    const settings = parseSiteSettings(s.settingsJson ?? null);
    return settings.finance?.webhookToken === token;
  });

  if (!site) {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 401 });
  }

  // Validate required fields
  if (!body.invoiceDate || !body.netTl || body.netTl <= 0) {
    return NextResponse.json(
      { error: "invoiceDate ve netTl (>0) zorunludur" },
      { status: 400 },
    );
  }

  const invoiceDate = new Date(body.invoiceDate);
  if (Number.isNaN(invoiceDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz invoiceDate formatı (ISO 8601 bekleniyor)" }, { status: 400 });
  }

  const direction = body.direction === "incoming" ? "incoming" : "outgoing";
  const kdvRate = normalizeKdvRate(Number(body.kdvRate ?? 20));
  const netMinor = Math.round(body.netTl * 100);
  const kdvMinor = body.kdvMinor != null
    ? Math.round(body.kdvMinor * 100)
    : calcKdv(netMinor, kdvRate);

  const entry = await prisma.invoiceEntry.create({
    data: {
      siteId: site.id,
      direction,
      invoiceDate,
      invoiceNo: body.invoiceNo?.trim() || null,
      counterparty: body.counterparty?.trim() || null,
      netMinor,
      kdvRate,
      kdvMinor,
      description: body.description?.trim() || null,
    },
  });

  // Sync obligations
  const settings = parseSiteSettings(site.settingsJson ?? null);
  const config = getTaxConfig(settings);
  await syncKdvFromInvoiceDate(site.id, invoiceDate);
  await syncGeciciObligations(site.id, invoiceDate.getUTCFullYear(), config.incomeBrackets);

  return NextResponse.json({ ok: true, id: entry.id });
}
