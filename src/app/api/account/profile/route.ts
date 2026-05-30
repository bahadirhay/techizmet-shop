import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/account/require-customer";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const { customer } = auth;
  return NextResponse.json({
    profile: {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, string>;
  const customer = await prisma.storeCustomer.update({
    where: { id: auth.customer.id },
    data: {
      firstName: body.firstName != null ? String(body.firstName).trim() : undefined,
      lastName: body.lastName != null ? String(body.lastName).trim() : undefined,
      phone: body.phone != null ? String(body.phone).trim() || null : undefined,
    },
  });
  return NextResponse.json({
    profile: {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
  });
}
