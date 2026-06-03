import { NextResponse } from "next/server";
import { resolveTrDistrictPostalCode } from "@/lib/tr-address/postal-code";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const city = params.get("city")?.trim() ?? "";
  const district = params.get("district")?.trim() ?? "";
  if (!city || !district) {
    return NextResponse.json({ error: "İl ve ilçe gerekli" }, { status: 400 });
  }
  const postalCode = await resolveTrDistrictPostalCode(city, district);
  return NextResponse.json({ postalCode: postalCode ?? "" });
}
