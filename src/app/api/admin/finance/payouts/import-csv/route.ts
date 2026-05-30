import { NextResponse } from "next/server";
import { importCsvPayouts, parsePayoutCsv } from "@/lib/finance/payout-reconciliation";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV dosyası gerekli" }, { status: 400 });
  }

  const text = await file.text();
  const { rows, errors: parseErrors } = parsePayoutCsv(text);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: parseErrors[0] ?? "İçe aktarılacak satır yok", parseErrors },
      { status: 400 },
    );
  }

  const result = await importCsvPayouts(auth.siteId, rows);

  return NextResponse.json({
    result: {
      ...result,
      parseErrors,
      message: `${result.created} hakediş kaydı oluşturuldu, ${result.skipped} atlandı`,
    },
  });
}
