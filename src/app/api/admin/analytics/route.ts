import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { loadAnalyticsFunnel } from "@/lib/analytics/funnel";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function abandonmentWhere(siteId: string, filter: string): Prisma.CartAbandonmentWhereInput {
  const base = { siteId, status: "open" as const };
  const now = Date.now();
  const min1h = new Date(now - 60 * 60 * 1000);
  const max72h = new Date(now - 72 * 60 * 60 * 1000);

  if (filter === "eligible") {
    return {
      ...base,
      remindedAt: null,
      customerId: { not: null },
      lastActivityAt: { lte: min1h, gte: max72h },
    };
  }
  if (filter === "not_reminded") return { ...base, remindedAt: null };
  if (filter === "no_email") {
    return {
      ...base,
      NOT: { visitor: { customer: { email: { not: null } } } },
    };
  }
  return base;
}

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const abandonFilter = url.searchParams.get("abandonFilter") ?? "all";
  const funnelDays = Math.min(90, Math.max(1, Number(url.searchParams.get("funnelDays") ?? "7") || 7));

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

  const [funnel, abandonments] = await Promise.all([
    loadAnalyticsFunnel(siteId, funnelDays),
    prisma.cartAbandonment.findMany({
    where: abandonmentWhere(siteId, abandonFilter),
    orderBy: { lastActivityAt: "desc" },
    take: 50,
    include: {
      visitor: {
        select: {
          customer: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  }),
  ]);

  return NextResponse.json({
    funnel,
    abandonFilter,
    summary: {
      visitors7d: visitorsWeek,
      openAbandonments,
      recoveredWeek,
      events7d: Object.fromEntries(eventCounts.map((e) => [e.eventType, e._count.id])),
    },
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      visitorKey: e.visitorKey,
      customerId: e.customerId,
      payload: e.payloadJson,
      createdAt: e.createdAt.toISOString(),
    })),
    abandonments: abandonments.map((a) => ({
      id: a.id,
      visitorKey: a.visitorKey,
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
