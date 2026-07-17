import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoxQrLanding } from "@/components/store/BoxQrLanding";
import { getCustomerBoxQrGrant } from "@/lib/box-qr/grant";
import { toBoxQrPublicConfig } from "@/lib/box-qr/settings";
import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = toBoxQrPublicConfig(settings);
  return {
    title: `${cfg.headline} | Anatolian Paw`,
    description: cfg.subhead,
    robots: { index: false, follow: false },
  };
}

export default async function BoxQrPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = toBoxQrPublicConfig(settings);
  if (!cfg.enabled) notFound();

  const session = await getCustomerSession();
  let initialGrant: {
    code: string;
    percentOff: number;
    expiresAt: string;
    alreadyHad: boolean;
  } | null = null;

  if (session?.customerId) {
    const grant = await getCustomerBoxQrGrant(site.id, session.customerId);
    if (grant && grant.expiresAt.getTime() > Date.now()) {
      initialGrant = {
        code: grant.code,
        percentOff: grant.percentOff,
        expiresAt: grant.expiresAt.toISOString(),
        alreadyHad: true,
      };
    }
  }

  return (
    <BoxQrLanding
      config={cfg}
      initialGrant={initialGrant}
      isLoggedIn={Boolean(session?.customerId)}
    />
  );
}
