import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const siteId = auth.siteId;
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [eventCounts, openAbandonments, recoveredWeek, visitorsWeek, recentEvents] =
    await Promise.all([
      prisma.storeEvent.groupBy({
        by: ["eventType"],
        where: { siteId, createdAt: { gte: since7d } },
        _count: { id: true },
      }),
      prisma.cartAbandonment.count({ where: { siteId, status: "open" } }),
      prisma.cartAbandonment.count({
        where: { siteId, status: "recovered", updatedAt: { gte: since7d } },
      }),
      prisma.visitorProfile.count({ where: { siteId, lastSeenAt: { gte: since7d } } }),
      prisma.storeEvent.findMany({
        where: { siteId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          eventType: true,
          visitorKey: true,
          customerId: true,
          payloadJson: true,
          createdAt: true,
        },
      }),
    ]);

  const abandonments = await prisma.cartAbandonment.findMany({
    where: { siteId, status: "open" },
    orderBy: { lastActivityAt: "desc" },
    take: 30,
    include: {
      visitor: {
        select: {
          customer: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    summary: {
      visitors7d: visitorsWeek,
      openAbandonments,
      recoveredWeek,
      events7d: Object.fromEntries(eventCounts.map((e) => [e.eventType, e._count.id])),
    },
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      visitorKey: e.visitorKey.slice(0, 10),
      customerId: e.customerId,
      payload: e.payloadJson,
      createdAt: e.createdAt.toISOString(),
    })),
    abandonments: abandonments.map((a) => ({
      id: a.id,
      visitorKey: a.visitorKey.slice(0, 10),
      customerEmail: a.visitor.customer?.email ?? null,
      customerName: [a.visitor.customer?.firstName, a.visitor.customer?.lastName]
        .filter(Boolean)
        .join(" ") || null,
      cartValueMinor: a.cartValueMinor,
      itemCount: a.itemCount,
      lastActivityAt: a.lastActivityAt.toISOString(),
      remindedAt: a.remindedAt?.toISOString() ?? null,
      itemsJson: a.itemsJson,
    })),
  });
}
