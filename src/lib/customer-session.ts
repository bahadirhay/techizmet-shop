import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type CustomerSession = {
  isLoggedIn?: boolean;
  customerId?: string;
  email?: string;
  siteId?: string;
};

const DEV_SECRET = "dev-insecure-secret-min-32-chars!!";

function resolveSessionSecret(): string {
  const trimmed = (process.env.SESSION_SECRET ?? "").trim();
  return trimmed.length >= 32 ? trimmed : DEV_SECRET;
}

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
