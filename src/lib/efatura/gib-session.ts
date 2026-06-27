/**
 * GİB e-Arşiv oturum yönetimi — token'ı DB'de cache'ler.
 * 100 fatura için 100 login yerine günde 1-2 login yeter.
 * Token ~2 saat geçerli; süresi dolunca otomatik yenilenir.
 */
import "server-only";

import { createFaturaClient } from "fatura";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import type { ResolvedEfaturaConfig } from "@/lib/efatura/settings";

const TOKEN_TTL_MS = 90 * 60 * 1000; // 90 dakika (GİB ~2 saat, güvenli marj)

type SessionCache = {
  token: string;
  expiresAt: string; // ISO
};

function parseSession(raw: unknown): SessionCache | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.token !== "string" || typeof s.expiresAt !== "string") return null;
  return { token: s.token, expiresAt: s.expiresAt };
}

async function readCachedToken(siteId: string): Promise<string | null> {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const session = parseSession((settings as unknown as Record<string, unknown>)._gibSession);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session.token;
}

async function writeCachedToken(siteId: string, token: string): Promise<void> {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const session: SessionCache = {
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  };
  // _gibSession'ı settings'e gizli alan olarak ekle (type assertion ile)
  const next = mergeSiteSettings(current, {} as Partial<SiteSettings>);
  (next as unknown as Record<string, unknown>)._gibSession = session;
  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(next) },
  });
}

async function clearCachedToken(siteId: string): Promise<void> {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const next = { ...current };
  delete (next as unknown as Record<string, unknown>)._gibSession;
  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(next) },
  });
}

export type GibSession = {
  token: string;
  client: ReturnType<typeof createFaturaClient>;
  logout: () => Promise<void>;
};

/**
 * Aktif GİB oturumu döner. Cache'de geçerli token varsa yeniden kullanır,
 * yoksa login yapar ve token'ı kaydeder.
 */
export async function getGibSession(
  siteId: string,
  config: ResolvedEfaturaConfig,
): Promise<GibSession> {
  const client = createFaturaClient(config.testMode ? "TEST" : "PROD");

  // Cache'den dene
  const cached = await readCachedToken(siteId);
  if (cached) {
    // Token hâlâ geçerli mi? Basit bir ping ile kontrol et
    try {
      await (client as unknown as { getUserData: (t: string) => Promise<unknown> }).getUserData(cached);
      return {
        token: cached,
        client,
        logout: async () => { /* cache'de oturum açık kalır, manuel logout yapmıyoruz */ },
      };
    } catch {
      // Token geçersiz — temizle ve yeniden giriş yap
      await clearCachedToken(siteId).catch(() => null);
    }
  }

  // Yeni login
  const token = await (client as unknown as { getToken: (u: string, p: string) => Promise<string> })
    .getToken(config.username, config.password);

  // Token'ı DB'ye kaydet (fire-and-forget, hata login'i engellemez)
  writeCachedToken(siteId, token).catch((e) => console.error("[gib-session] cache write:", e));

  return {
    token,
    client,
    logout: async () => {
      // Oturumu kapatmıyoruz — token TTL'e kadar geçerli kalır.
      // Gerekirse clearCachedToken çağrılabilir.
    },
  };
}

/** Oturumu zorla yeniler (hata durumunda çağrılır) */
export async function refreshGibSession(
  siteId: string,
  config: ResolvedEfaturaConfig,
): Promise<GibSession> {
  await clearCachedToken(siteId).catch(() => null);
  return getGibSession(siteId, config);
}
