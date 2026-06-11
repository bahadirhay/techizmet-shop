import type { SiteSeoAuditItem, SiteSeoPageRecord } from "@/lib/admin/site-seo/types";

function statusScore(status: SiteSeoAuditItem["status"]): number {
  if (status === "ok") return 2;
  if (status === "warn") return 1;
  return 0;
}

export function evaluateSitePageSeo(page: SiteSeoPageRecord, siteUrl: string): SiteSeoAuditItem[] {
  const items: SiteSeoAuditItem[] = [];
  const seoTitle = page.seoTitle.trim();
  const seoDesc = page.seoDescription.trim();
  const preview = `${siteUrl.replace(/\/$/, "")}${page.path}`;

  items.push({
    id: "title",
    label: "Sayfa başlığı",
    status: page.title.trim().length >= 2 ? "ok" : "fail",
    detail: page.title.trim() || "Başlık eksik",
  });

  items.push({
    id: "seo-title",
    label: "SEO meta başlık",
    status:
      seoTitle.length >= 25 && seoTitle.length <= 65
        ? "ok"
        : seoTitle.length > 0
          ? "warn"
          : "fail",
    detail: seoTitle
      ? `${seoTitle.length} karakter`
      : "Boş — site SEO çalışması ile doldurulmalı",
  });

  items.push({
    id: "seo-desc",
    label: "SEO meta açıklama",
    status:
      seoDesc.length >= 70 && seoDesc.length <= 165
        ? "ok"
        : seoDesc.length > 0
          ? "warn"
          : "fail",
    detail: seoDesc
      ? `${seoDesc.length} karakter${seoDesc.length < 70 ? " — en az 70 önerilir" : ""}`
      : "Boş — arama sonuçlarında zayıf görünüm",
  });

  if (page.imageUrl?.trim()) {
    items.push({
      id: "image-alt",
      label: "Görsel alt metni",
      status: page.imageAlt?.trim() ? "ok" : "warn",
      detail: page.imageAlt?.trim() || "Görsel var ama alt metin yok — erişilebilirlik ve görsel arama için ekleyin",
    });
  } else if (
    page.kind === "blog-post" ||
    page.kind === "collection" ||
    page.kind === "category" ||
    page.kind === "collections" ||
    page.kind === "blog-list"
  ) {
    items.push({
      id: "image",
      label: "Paylaşım görseli",
      status: "warn",
      detail: "OG / sosyal önizleme görseli yok",
    });
  }

  items.push({
    id: "path",
    label: "URL",
    status: page.path.startsWith("/") ? "ok" : "fail",
    detail: preview,
  });

  items.push({
    id: "indexable",
    label: "Yayında",
    status: page.published ? "ok" : "fail",
    detail: page.published ? "İndekslenebilir" : "Yayında değil",
  });

  return items;
}

export function scoreSitePage(items: SiteSeoAuditItem[]): number {
  const max = items.length * 2;
  const got = items.reduce((s, i) => s + statusScore(i.status), 0);
  return max > 0 ? Math.round((got / max) * 100) : 0;
}
