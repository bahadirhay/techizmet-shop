import { NextResponse } from "next/server";
import { recordManualStreetFoodContribution } from "@/lib/street-food-fund/contribution";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { grams?: number; note?: string };
  const grams = Math.round(Number(body.grams) || 0);
  if (grams <= 0) {
    return NextResponse.json({ error: "Geçerli bir gram değeri girin" }, { status: 400 });
  }

  const result = await recordManualStreetFoodContribution(auth.siteId, grams, body.note);
  if (!result.recorded) {
    return NextResponse.json(
      { error: "Mama fonu kapalı veya aktif kampanya yok" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, grams: result.grams });
}
