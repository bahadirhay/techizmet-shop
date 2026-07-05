/** Canlı ana sayfa — LCP hero görsel boyutlandırma denetimi */

export type HomeLcpProbeResult = {
  ok: boolean;
  detail: string;
  issues: string[];
};

export function analyzeHomeLcpFromHtml(html: string): HomeLcpProbeResult {
  const issues: string[] = [];
  const lcpImg =
    html.match(
      /<section[^>]*section-media-grid[^>]*>[\s\S]{0,12000}?<img\b[^>]*class="[^"]*media_image[^"]*"[^>]*>/i,
    )?.[0] ?? "";

  if (!lcpImg) {
    return { ok: true, detail: "Media grid hero bulunamadı — LCP denetimi atlandı", issues };
  }

  if (/loading=["']lazy["']/i.test(lcpImg) || /lazyload=["']lazy["']/i.test(lcpImg)) {
    issues.push("LCP hero lazy yükleme kullanıyor");
  }
  if (!/fetchpriority=["']high["']/i.test(lcpImg)) {
    issues.push("fetchpriority=high eksik");
  }

  const src = lcpImg.match(/(?<![a-z-])src="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&") ?? "";
  if (src) {
    const isFullMedia = /^\/api\/media\/[^/?]+$/i.test(src.split("?")[0] ?? "");
    const hasWidth = /[?&]width=\d+/i.test(src) || src.includes("/api/resize-image");
    if (isFullMedia && !hasWidth) {
      issues.push("LCP hero tam boy /api/media ile sunuluyor");
    }
  }

  if (!/srcset=|data-srcset=/i.test(lcpImg)) {
    issues.push("Responsive srcset eksik");
  }

  return {
    ok: issues.length === 0,
    detail: issues.length ? issues.join("; ") : "LCP hero doğru boyutlandırılmış",
    issues,
  };
}

export async function probeHomeLcpFromOrigin(origin: string): Promise<HomeLcpProbeResult> {
  try {
    const res = await fetch(`${origin}/`, {
      cache: "no-store",
      headers: { "User-Agent": "techizmet-perf-probe/1" },
    });
    if (!res.ok) {
      return { ok: false, detail: `Ana sayfa HTTP ${res.status}`, issues: ["Ana sayfa yüklenemedi"] };
    }
    const html = await res.text();
    return analyzeHomeLcpFromHtml(html);
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "Ana sayfa okunamadı",
      issues: ["Ana sayfa okunamadı"],
    };
  }
}
