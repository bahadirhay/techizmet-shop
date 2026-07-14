import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { issueManualInvoice, type ManualInvoiceLine } from "@/lib/efatura/manual-invoice";
import { closeGibSessionForSite } from "@/lib/efatura/gib-session";

type Body = {
  recipientName: string;
  recipientTaxId?: string;
  recipientTaxOffice?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  lines: ManualInvoiceLine[];
  invoiceDate?: string;
  description?: string;
};

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Body;

  if (!body.recipientName?.trim()) {
    return NextResponse.json({ error: "Alıcı adı/ünvanı zorunludur" }, { status: 400 });
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "En az bir fatura satırı gerekli" }, { status: 400 });
  }

  try {
    const result = await issueManualInvoice(
      auth.siteId,
      {
        recipientName: body.recipientName.trim(),
        recipientTaxId: body.recipientTaxId?.trim() || undefined,
        recipientTaxOffice: body.recipientTaxOffice?.trim() || undefined,
        recipientAddress: body.recipientAddress?.trim() || undefined,
        recipientCity: body.recipientCity?.trim() || undefined,
        recipientEmail: body.recipientEmail?.trim() || undefined,
        recipientPhone: body.recipientPhone?.trim() || undefined,
        lines: body.lines,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
        description: body.description?.trim() || undefined,
      },
      auth.staffUserId,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } finally {
    await closeGibSessionForSite(auth.siteId);
  }
}
