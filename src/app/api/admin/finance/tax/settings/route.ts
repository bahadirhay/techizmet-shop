import { NextResponse } from "next/server";
import { getTaxConfig, type IncomeBracket } from "@/lib/finance/tax";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";

type Body = {
  openingDate?: string;
  vkn?: string;
  vergiDairesi?: string;
  faaliyetKodu?: string;
  incomeBrackets?: { upTo: number | null; rate: number }[];
  stampDuty?: { kdv?: number; muhtasar?: number; gecici?: number; yillikGelir?: number };
  muhtasarPeriod?: "monthly" | "quarterly";
};

function sanitizeBrackets(input: unknown): IncomeBracket[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const rows = input
    .map((b) => {
      const rate = Number((b as { rate?: unknown }).rate);
      const upToRaw = (b as { upTo?: unknown }).upTo;
      const upTo =
        upToRaw === null || upToRaw === undefined || upToRaw === "" ? null : Number(upToRaw);
      return { upTo, rate };
    })
    .filter((b) => Number.isFinite(b.rate) && (b.upTo === null || Number.isFinite(b.upTo)));
  return rows.length > 0 ? rows : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as Body;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const currentTax = current.finance?.tax ?? {};

  const brackets = sanitizeBrackets(body.incomeBrackets);

  const merged = mergeSiteSettings(current, {
    finance: {
      ...current.finance,
      tax: {
        ...currentTax,
        ...(body.openingDate !== undefined ? { openingDate: body.openingDate || undefined } : {}),
        ...(body.vkn !== undefined ? { vkn: body.vkn.trim() || undefined } : {}),
        ...(body.vergiDairesi !== undefined ? { vergiDairesi: body.vergiDairesi.trim() || undefined } : {}),
        ...(body.faaliyetKodu !== undefined ? { faaliyetKodu: body.faaliyetKodu.trim() || undefined } : {}),
        ...(brackets ? { incomeBrackets: brackets } : {}),
        ...(body.stampDuty
          ? {
              stampDuty: {
                ...currentTax.stampDuty,
                ...(numOrUndef(body.stampDuty.kdv) !== undefined
                  ? { kdv: numOrUndef(body.stampDuty.kdv) }
                  : {}),
                ...(numOrUndef(body.stampDuty.muhtasar) !== undefined
                  ? { muhtasar: numOrUndef(body.stampDuty.muhtasar) }
                  : {}),
                ...(numOrUndef(body.stampDuty.gecici) !== undefined
                  ? { gecici: numOrUndef(body.stampDuty.gecici) }
                  : {}),
                ...(numOrUndef(body.stampDuty.yillikGelir) !== undefined
                  ? { yillikGelir: numOrUndef(body.stampDuty.yillikGelir) }
                  : {}),
              },
            }
          : {}),
        ...(body.muhtasarPeriod === "monthly" || body.muhtasarPeriod === "quarterly"
          ? { muhtasarPeriod: body.muhtasarPeriod }
          : {}),
      },
    },
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });

  return NextResponse.json({ config: getTaxConfig(merged) });
}
