import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { CartSessionData } from "@/lib/cart/types";

export type CartSession = CartSessionData & {
  isLoggedIn?: boolean;
};

const DEV_SECRET = "dev-insecure-secret-min-32-chars!!";

function resolveSessionSecret(): string {
  const trimmed = (process.env.SESSION_SECRET ?? "").trim();
  return trimmed.length >= 32 ? trimmed : DEV_SECRET;
}

export function getCartSessionOptions(): SessionOptions {
  return {
    password: resolveSessionSecret(),
    cookieName: "techizmet_shop_cart",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    },
  };
}

export async function getCartSession() {
  const session = await getIronSession<CartSession>(await cookies(), getCartSessionOptions());
  if (!session.items) session.items = [];
  return session;
}

export async function saveCartSession(data: CartSessionData) {
  const session = await getCartSession();
  session.items = data.items;
  session.couponCode = data.couponCode ?? null;
  await session.save();
}

export async function clearCartSession() {
  const session = await getCartSession();
  session.items = [];
  session.couponCode = null;
  await session.save();
}
