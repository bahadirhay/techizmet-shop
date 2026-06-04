import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type RouteCtx = { params: Promise<{ visitorKey: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const { visitorKey } = await ctx.params;
  const key = visitorKey?.trim();
  if (!key) {
    return NextResponse.json({ error: "Ziyaretçi bulunamadı" }, { status: 404 });
  }

  const siteId = auth.siteId;

  const profile = await prisma.visitorProfile.findUnique({
    where: { siteId_visitorKey: { siteId, visitorKey: key } },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Ziyaretçi bulunamadı" }, { status: 404 });
  }

  const [events, carts] = await Promise.all([
    prisma.storeEvent.findMany({
      where: { siteId, visitorKey: key },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        eventType: true,
        payloadJson: true,
        createdAt: true,
        customerId: true,
      },
    }),
    prisma.cartAbandonment.findMany({
      where: { siteId, visitorKey: key },
      orderBy: { lastActivityAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        itemsJson: true,
        cartValueMinor: true,
        itemCount: true,
        lastActivityAt: true,
        remindedAt: true,
        convertedOrderId: true,
        createdAt: true,
      },
    }),
  ]);

  const customerName = profile.customer
    ? [profile.customer.firstName, profile.customer.lastName].filter(Boolean).join(" ")
    : null;

  return NextResponse.json({
    profile: {
      visitorKey: profile.visitorKey,
      firstSeenAt: profile.firstSeenAt.toISOString(),
      lastSeenAt: profile.lastSeenAt.toISOString(),
      deviceType: profile.deviceType,
      userAgent: profile.userAgent,
      utmSource: profile.utmSource,
      utmMedium: profile.utmMedium,
      utmCampaign: profile.utmCampaign,
      customerId: profile.customerId,
      customerEmail: profile.customer?.email ?? null,
      customerName: customerName || null,
      customerPhone: profile.customer?.phone ?? null,
      customerSince: profile.customer?.createdAt.toISOString() ?? null,
    },
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      payloadJson: e.payloadJson,
      createdAt: e.createdAt.toISOString(),
    })),
    cartAbandonments: carts.map((c) => ({
      id: c.id,
      status: c.status,
      itemsJson: c.itemsJson,
      cartValueMinor: c.cartValueMinor,
      itemCount: c.itemCount,
      lastActivityAt: c.lastActivityAt.toISOString(),
      remindedAt: c.remindedAt?.toISOString() ?? null,
      convertedOrderId: c.convertedOrderId,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
