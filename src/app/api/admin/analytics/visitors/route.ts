import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 50));

  const siteId = auth.siteId;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const profiles = await prisma.visitorProfile.findMany({
    where: { siteId, lastSeenAt: { gte: since30d } },
    orderBy: { lastSeenAt: "desc" },
    take: 200,
    include: {
      customer: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  const keys = profiles.map((p) => p.visitorKey);

  const [eventCounts, openCarts] = await Promise.all([
    keys.length
      ? prisma.storeEvent.groupBy({
          by: ["visitorKey"],
          where: { siteId, visitorKey: { in: keys } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    keys.length
      ? prisma.cartAbandonment.findMany({
          where: { siteId, visitorKey: { in: keys }, status: "open" },
          select: {
            visitorKey: true,
            cartValueMinor: true,
            itemCount: true,
            lastActivityAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const countByKey = new Map(eventCounts.map((e) => [e.visitorKey, e._count.id]));
  const cartByKey = new Map(openCarts.map((c) => [c.visitorKey, c]));

  let rows = profiles.map((p) => {
    const name = [p.customer?.firstName, p.customer?.lastName].filter(Boolean).join(" ");
    const cart = cartByKey.get(p.visitorKey);
    return {
      visitorKey: p.visitorKey,
      firstSeenAt: p.firstSeenAt.toISOString(),
      lastSeenAt: p.lastSeenAt.toISOString(),
      deviceType: p.deviceType,
      utmSource: p.utmSource,
      customerId: p.customerId,
      customerEmail: p.customer?.email ?? null,
      customerName: name || null,
      eventCount: countByKey.get(p.visitorKey) ?? 0,
      openCartValueMinor: cart?.cartValueMinor ?? null,
      openCartItems: cart?.itemCount ?? null,
      openCartAt: cart?.lastActivityAt.toISOString() ?? null,
    };
  });

  if (q) {
    rows = rows.filter((r) => {
      const hay = [
        r.visitorKey,
        r.customerEmail ?? "",
        r.customerName ?? "",
        r.utmSource ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return NextResponse.json({ visitors: rows.slice(0, limit) });
}
