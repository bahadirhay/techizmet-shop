import { NextResponse } from "next/server";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView } from "@/lib/cart/service";
import { getCartSession, saveCartSession } from "@/lib/cart/session";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string };
  const code = String(body.code ?? "").trim().toUpperCase() || null;
  const site = await getDefaultSite();
  const session = await getCartSession();
  const next = { items: session.items, couponCode: code };
  await saveCartSession(next);
  const cart = await buildCartView(next, site.id, await getCartCustomerId());
  return NextResponse.json({ cart });
}

export async function DELETE() {
  const site = await getDefaultSite();
  const session = await getCartSession();
  const next = { items: session.items, couponCode: null };
  await saveCartSession(next);
  const cart = await buildCartView(next, site.id, await getCartCustomerId());
  return NextResponse.json({ cart });
}
