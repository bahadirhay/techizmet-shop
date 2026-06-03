import { NextResponse } from "next/server";
import { listTrNeighborhoods } from "@/lib/tr-address/index";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const city = params.get("city")?.trim() ?? "";
  const district = params.get("district")?.trim() ?? "";
  if (!city || !district) {
    return NextResponse.json({ error: "İl ve ilçe gerekli" }, { status: 400 });
  }
  const neighborhoods = listTrNeighborhoods(city, district);
  if (neighborhoods.length === 0) {
    return NextResponse.json({ error: "Geçersiz ilçe" }, { status: 404 });
  }
  return NextResponse.json({ neighborhoods });
}
