import { NextResponse } from "next/server";
import { loadAnalyticsFunnel } from "@/lib/analytics/funnel";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]) {
  return `${cells.map(csvEscape).join(",")}\n`;
}

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "funnel";
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? "7") || 7));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const siteId = auth.siteId;

  if (kind === "funnel") {
    const funnel = await loadAnalyticsFunnel(siteId, days);
    const body =
      csvRow(["Metrik", "Olay sayısı", "Benzersiz ziyaretçi"]) +
      csvRow(["Sayfa görüntüleme", funnel.pageViews, funnel.visitorsWithPageView]) +
      csvRow(["Ürün görüntüleme", funnel.productViews, ""]) +
      csvRow(["Sepete ekleme", funnel.addToCart, funnel.visitorsWithAddToCart]) +
      csvRow(["Ödemeye başlama", funnel.beginCheckout, funnel.visitorsWithCheckout]) +
      csvRow(["Satın alma", funnel.purchases, funnel.visitorsWithPurchase]);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="huni-${days}gun.csv"`,
      },
    });
  }

  if (kind === "abandonments") {
    const rows = await prisma.cartAbandonment.findMany({
      where: { siteId, status: "open" },
      orderBy: { lastActivityAt: "desc" },
      take: 500,
      include: {
        visitor: { select: { customer: { select: { email: true, firstName: true, lastName: true } } } },
      },
    });
    let body = csvRow([
      "id",
      "visitorKey",
      "email",
      "name",
      "cartValueMinor",
      "itemCount",
      "lastActivityAt",
      "remindedAt",
    ]);
    for (const a of rows) {
      const c = a.visitor.customer;
      body += csvRow([
        a.id,
        a.visitorKey,
        c?.email,
        [c?.firstName, c?.lastName].filter(Boolean).join(" "),
        a.cartValueMinor,
        a.itemCount,
        a.lastActivityAt.toISOString(),
        a.remindedAt?.toISOString() ?? "",
      ]);
    }
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sepet-terk.csv"`,
      },
    });
  }

  if (kind === "events") {
    const rows = await prisma.storeEvent.findMany({
      where: { siteId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        eventType: true,
        visitorKey: true,
        customerId: true,
        payloadJson: true,
        createdAt: true,
      },
    });
    let body = csvRow(["createdAt", "eventType", "visitorKey", "customerId", "payload"]);
    for (const e of rows) {
      body += csvRow([
        e.createdAt.toISOString(),
        e.eventType,
        e.visitorKey,
        e.customerId,
        e.payloadJson,
      ]);
    }
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="olaylar-${days}gun.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Geçersiz kind" }, { status: 400 });
}
