import { NextResponse } from "next/server";
import { generateUniqueProductBarcode, getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { excludeProductId?: string };
  const settings = await getSiteSettings(auth.siteId);
  const { prefix } = getProductBarcodeSettings(settings);

  try {
    const barcode = await generateUniqueProductBarcode(
      prisma,
      auth.siteId,
      prefix,
      body.excludeProductId?.trim() || undefined,
    );
    return NextResponse.json({ barcode });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Barkod üretilemedi" },
      { status: 500 },
    );
  }
}
