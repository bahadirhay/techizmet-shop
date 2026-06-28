import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export type RecipientSuggestion = {
  id: string;
  source: "customer" | "counterparty";
  name: string;
  email: string;
  phone: string;
  taxId: string;
  taxOffice: string;
  address: string;
  city: string;
};

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const [customers, counterparties] = await Promise.all([
    prisma.storeCustomer.findMany({
      where: {
        siteId: auth.siteId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { taxId: { contains: q } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        taxId: true,
        taxOffice: true,
        addresses: {
          where: { isDefault: true },
          select: { line1: true, district: true, city: true },
          take: 1,
        },
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.financeCounterparty.findMany({
      where: {
        siteId: auth.siteId,
        active: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { taxId: { contains: q } },
        ],
      },
      select: {
        id: true,
        title: true,
        email: true,
        phone: true,
        taxId: true,
        taxOffice: true,
        addressLine: true,
        city: true,
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const customerSuggestions: RecipientSuggestion[] = customers.map((c) => {
    const addr = c.addresses[0];
    const name =
      c.companyName?.trim() ||
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    return {
      id: c.id,
      source: "customer",
      name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      taxId: c.taxId ?? "",
      taxOffice: c.taxOffice ?? "",
      address: addr ? [addr.line1, addr.district].filter(Boolean).join(", ") : "",
      city: addr?.city ?? "",
    };
  });

  const counterpartySuggestions: RecipientSuggestion[] = counterparties.map((cp) => ({
    id: cp.id,
    source: "counterparty",
    name: cp.title,
    email: cp.email ?? "",
    phone: cp.phone ?? "",
    taxId: cp.taxId ?? "",
    taxOffice: cp.taxOffice ?? "",
    address: cp.addressLine ?? "",
    city: cp.city ?? "",
  }));

  // Cari olanlar önce, sonra üyeler; toplam 8 sonuç
  const seen = new Set<string>();
  const suggestions: RecipientSuggestion[] = [];
  for (const s of [...counterpartySuggestions, ...customerSuggestions]) {
    const key = `${s.source}:${s.id}`;
    if (!seen.has(key)) { seen.add(key); suggestions.push(s); }
    if (suggestions.length >= 8) break;
  }

  return NextResponse.json({ suggestions });
}
