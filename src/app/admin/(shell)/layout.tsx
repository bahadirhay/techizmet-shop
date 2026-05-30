import { ShopAdminShell } from "@/components/admin/ShopAdminShell";
import { loadNavBadges } from "@/lib/admin/nav-badges";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireStaffPage();
  const navBadges = await loadNavBadges(auth.siteId);
  return (
    <ShopAdminShell auth={auth} navBadges={navBadges}>
      {children}
    </ShopAdminShell>
  );
}
