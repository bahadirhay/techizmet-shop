import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type CustomerSession = {
  isLoggedIn?: boolean;
  customerId?: string;
  email?: string;
  siteId?: string;
};

import { resolveSessionSecret } from "@/lib/session-secret";

export function getCustomerSessionOptions(): SessionOptions {
  return {
    password: resolveSessionSecret(),
    cookieName: "techizmet_shop_customer",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    },
  };
}

export async function getCustomerSession() {
  return getIronSession<CustomerSession>(await cookies(), getCustomerSessionOptions());
}
