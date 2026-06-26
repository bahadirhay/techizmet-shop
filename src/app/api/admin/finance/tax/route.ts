import { NextResponse } from "next/server";
import { generateYearObligations, getTaxConfig } from "@/lib/finance/tax";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";

function resolveYear(raw: string | null): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 2000 && n <= 2100) return n;
  return new Date().getUTCFullYear();
}

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const year = resolveYear(url.searchParams.get("year"));

  const [site, obligations] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: auth.siteId } }),
    prisma.taxObligation.findMany({
      where: { siteId: auth.siteId, year },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = getTaxConfig(settings);

  return NextResponse.json({ year, obligations, config });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as { year?: number };
  const year = resolveYear(body.year != null ? String(body.year) : null);

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = getTaxConfig(settings);

  const seeds = generateYearObligations(year, config);

  // Idempotent: mevcut (siteId, periodKey) kayıtları atlanır — kullanıcı düzenlemeleri korunur.
  const result = await prisma.taxObligation.createMany({
    data: seeds.map((s) => ({
      siteId: auth.siteId,
      year: s.year,
      type: s.type,
      periodKey: s.periodKey,
      periodLabel: s.periodLabel,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      dueDate: s.dueDate,
      stampDutyMinor: s.stampDutyMinor,
    })),
    skipDuplicates: true,
  });

  const obligations = await prisma.taxObligation.findMany({
    where: { siteId: auth.siteId, year },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ year, created: result.count, obligations, config });
}
