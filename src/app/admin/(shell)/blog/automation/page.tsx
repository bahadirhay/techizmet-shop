import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BlogAutomationPanel } from "@/components/admin/BlogAutomationPanel";
import { parseGscSettings, toClientGscState } from "@/lib/admin/gsc/settings";
import { parseSeoAiSettings, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import {
  parseBlogAutomationSettings,
  toClientBlogAutomationState,
} from "@/lib/admin/blog-automation/settings";
import { getSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function BlogAutomationAdminPage() {
  const auth = await requireStaffPage();
  const settings = await getSiteSettings(auth.siteId);
  const resolved = parseBlogAutomationSettings(settings.blogAutomation);
  const gscResolved = parseGscSettings(settings.gsc);
  const ai = seoAiAvailable(parseSeoAiSettings(settings.seoAi));

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Blog yazıları", href: "/admin/blog" },
          { label: "Otomasyon" },
        ]}
        title="Blog otomasyonu"
        description="Site araması ve popüler ürünlerden konu seçimi, AI ile taslak blog üretimi."
        actions={
          <Link href="/admin/blog" className="text-sm font-medium text-[var(--kn-brand)] underline">
            ← Blog listesi
          </Link>
        }
      />
      <div className="mt-6">
        <BlogAutomationPanel
          initial={toClientBlogAutomationState(settings.blogAutomation, resolved)}
          gscInitial={toClientGscState(gscResolved)}
          aiAvailable={ai.any}
        />
      </div>
    </div>
  );
}
