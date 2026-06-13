import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function whereForFilter(siteId: string, filter: string): Prisma.CartAbandonmentWhereInput {
  const base: Prisma.CartAbandonmentWhereInput = { siteId, status: "open" };
  const now = Date.now();
  const min1h = new Date(now - 60 * 60 * 1000);

  if (filter === "checkout") return { ...base, stage: "checkout" };
  if (filter === "has_contact") {
    return {
      ...base,
      OR: [
        { guestEmail: { not: null } },
        { guestPhone: { not: null } },
        { customerId: { not: null } },
      ],
    };
  }
  if (filter === "eligible") {
    return {
      ...base,
      remindedAt: null,
      lastActivityAt: { lte: min1h },
      OR: [{ guestEmail: { not: null } }, { customerId: { not: null } }],
    };
  }
  if (filter === "no_contact") {
    return {
      ...base,
      guestEmail: null,
      guestPhone: null,
      customerId: null,
    };
  }
  return base;
}

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const siteId = auth.siteId;

  const [rows, openCount, checkoutCount, recoveredWeek] = await Promise.all([
    prisma.cartAbandonment.findMany({
      where: whereForFilter(siteId, filter),
      orderBy: { lastActivityAt: "desc" },
      take: 100,
      include: {
        visitor: {
          select: {
            customer: {
              select: { email: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    }),
    prisma.cartAbandonment.count({ where: { siteId, status: "open" } }),
    prisma.cartAbandonment.count({ where: { siteId, status: "open", stage: "checkout" } }),
    prisma.cartAbandonment.count({
      where: { siteId, status: "recovered", updatedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
  ]);

  return NextResponse.json({
    filter,
    summary: { openCount, checkoutCount, recoveredWeek },
    rows: rows.map((a) => ({
      id: a.id,
      visitorKey: a.visitorKey,
      stage: a.stage,
      customerEmail:
        a.guestEmail ??
        a.visitor.customer?.email ??
        null,
      customerPhone:
        a.guestPhone ??
        a.visitor.customer?.phone ??
        null,
      customerName:
        [a.visitor.customer?.firstName, a.visitor.customer?.lastName].filter(Boolean).join(" ") ||
        null,
      cartValueMinor: a.cartValueMinor,
      itemCount: a.itemCount,
      lastActivityAt: a.lastActivityAt.toISOString(),
      remindedAt: a.remindedAt?.toISOString() ?? null,
      whatsappRemindedAt: a.whatsappRemindedAt?.toISOString() ?? null,
      notes: a.notes,
      itemsJson: a.itemsJson,
      hasCustomerAccount: Boolean(a.customerId),
    })),
  });
}
