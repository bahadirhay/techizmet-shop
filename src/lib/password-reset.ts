import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function createPasswordResetRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function issueCustomerPasswordResetToken(siteId: string, customerId: string) {
  const raw = createPasswordResetRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { siteId, customerId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { siteId, customerId, tokenHash, expiresAt },
  });

  return { raw, expiresAt };
}

export async function consumeCustomerPasswordResetToken(siteId: string, rawToken: string) {
  const tokenHash = hashToken(rawToken.trim());
  const row = await prisma.passwordResetToken.findFirst({
    where: {
      siteId,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { customer: { select: { id: true, email: true, passwordHash: true } } },
  });
  if (!row?.customer?.email) return null;
  return row;
}

export async function markPasswordResetTokenUsed(id: string) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export function publicStoreBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ||
    "http://localhost:5555"
  );
}
