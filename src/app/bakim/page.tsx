import { redirect } from "next/navigation";
import { parseMaintenanceSettings } from "@/lib/maintenance-mode";
import { parseSiteSettings } from "@/lib/site-settings";
import { getSiteBranding } from "@/lib/site-settings-branding";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const site = await getDefaultSite();
  const row = await prisma.storeSite.findUnique({ where: { id: site.id } });
  const settings = parseSiteSettings(row?.settingsJson ?? null);
  const maintenance = parseMaintenanceSettings(settings);

  if (!maintenance.enabled) {
    redirect("/");
  }

  const branding = getSiteBranding(settings);
  const siteName = row?.name?.trim() || site.name;

  return (
    <main className="kn-maintenance-page">
      <div className="kn-maintenance-card">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt="" className="kn-maintenance-logo" />
        ) : (
          <p className="kn-maintenance-site">{siteName}</p>
        )}
        <h1>{maintenance.title}</h1>
        <p>{maintenance.message}</p>
        <p className="kn-maintenance-hint">Anlayışınız için teşekkür ederiz.</p>
      </div>
      <style>{`
        .kn-maintenance-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          background: linear-gradient(160deg, #faf9f7 0%, #eef2f7 55%, #f5ebe3 100%);
          color: #1a1a1a;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .kn-maintenance-card {
          width: min(100%, 28rem);
          text-align: center;
          padding: 2.25rem 2rem;
          border-radius: 1.25rem;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e8e4df;
          box-shadow: 0 12px 40px rgba(45, 74, 111, 0.08);
        }
        .kn-maintenance-logo {
          max-height: 3rem;
          width: auto;
          margin: 0 auto 1.25rem;
          display: block;
          object-fit: contain;
        }
        .kn-maintenance-site {
          font-size: 1.125rem;
          font-weight: 700;
          color: #2d4a6f;
          margin: 0 0 1.25rem;
        }
        .kn-maintenance-card h1 {
          font-size: clamp(1.5rem, 4vw, 1.875rem);
          font-weight: 700;
          line-height: 1.25;
          margin: 0 0 0.75rem;
          color: #2d4a6f;
        }
        .kn-maintenance-card p {
          margin: 0;
          line-height: 1.6;
          color: #52525b;
        }
        .kn-maintenance-hint {
          margin-top: 1.25rem !important;
          font-size: 0.875rem;
          color: #71717a !important;
        }
      `}</style>
    </main>
  );
}
