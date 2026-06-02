import { NextResponse } from "next/server";
import { postInvoiceToFinance } from "@/lib/finance/invoice-posting";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const now = new Date();
  const jobs = await prisma.financeInvoicePostJob.findMany({
    where: {
      siteId: auth.siteId,
      status: { in: ["queued", "failed"] },
      nextRetryAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } }],
    },
    orderBy: [{ nextRetryAt: "asc" }],
    take: 20,
  });

  let done = 0;
  let failed = 0;
  for (const job of jobs) {
    await prisma.financeInvoicePostJob.update({
      where: { id: job.id },
      data: { lockedAt: new Date(), status: "processing", attempts: { increment: 1 } },
    });
    try {
      await postInvoiceToFinance(prisma, {
        siteId: auth.siteId,
        invoiceId: job.invoiceId,
        actorUserId: auth.staffUserId,
        note: "Retry kuyruğundan başarıyla muhasebeye işlendi.",
      });
      await prisma.financeInvoicePostJob.update({
        where: { id: job.id },
        data: { status: "done", lockedAt: null, completedAt: new Date(), lastError: null },
      });
      done++;
    } catch (err) {
      failed++;
      const attempts = job.attempts + 1;
      await prisma.financeInvoicePostJob.update({
        where: { id: job.id },
        data: {
          status: attempts >= job.maxAttempts ? "dead" : "failed",
          lockedAt: null,
          lastError: err instanceof Error ? err.message : "Bilinmeyen hata",
          nextRetryAt: new Date(Date.now() + Math.min(60 * attempts, 3600) * 1000),
        },
      });
    }
  }

  return NextResponse.json({ processed: jobs.length, done, failed });
}
