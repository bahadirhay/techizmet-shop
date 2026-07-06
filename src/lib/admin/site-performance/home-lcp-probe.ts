/** Canlı ana sayfa — LCP hero + CLS denetimi */

export type HomeLcpProbeResult = {
  ok: boolean;
  detail: string;
  issues: string[];
};

function firstLcpHeroImgTag(html: string): string {
  return (
    html.match(
      /<section[^>]*section-media-grid[^>]*>[\s\S]{0,12000}?<img\b[^>]*class="[^"]*media_image[^"]*"[^>]*>/i,
    )?.[0] ?? ""
  );
}

export function analyzeHomeLcpFromHtml(html: string): HomeLcpProbeResult {
  const issues: string[] = [];
  const lcpImg = firstLcpHeroImgTag(html);

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
    const widthParam = src.match(/[?&]width=(\d+)/i)?.[1];
    const w = widthParam ? Number.parseInt(widthParam, 10) : 0;
    if (!widthParam) {
      issues.push("LCP hero src width parametresi yok");
    } else if (w > 720) {
      issues.push(`LCP hero çok büyük (${w}px) — mobilde 640 hedeflenmeli`);
    }
    if (/srcset=/i.test(lcpImg)) {
      const hasResponsivePreload = /rel="preload"[^>]*as="image"[^>]*imagesrcset=/i.test(html);
      const hasSizes = /sizes=/i.test(lcpImg);
      if (!hasSizes) {
        issues.push("LCP hero srcset var ama sizes eksik");
      } else if (!hasResponsivePreload) {
        issues.push("LCP hero srcset var ama imagesrcset preload eksik");
      }
    }
  }

  const attrW = Number.parseInt(lcpImg.match(/\swidth="(\d+)"/i)?.[1] ?? "", 10);
  if (!Number.isFinite(attrW) || attrW > 900) {
    issues.push(`LCP hero width özniteliği çok büyük (${attrW || "yok"}) — CLS`);
  }

  const attrH = Number.parseInt(lcpImg.match(/\sheight="(\d+)"/i)?.[1] ?? "", 10);
  const aspect = Number.parseFloat(lcpImg.match(/data-aspectratio="([^"]+)"/i)?.[1] ?? "");
  if (Number.isFinite(attrW) && attrW > 0 && Number.isFinite(attrH) && attrH > 0 && Number.isFinite(aspect) && aspect > 0) {
    const expected = Math.round(attrW / aspect);
    if (Math.abs(expected - attrH) > 3) {
      issues.push("width/height oranı data-aspectratio ile uyuşmuyor");
    }
  }

  return {
    ok: issues.length === 0,
    detail: issues.length ? issues.join("; ") : "LCP hero boyutlandırılmış, CLS güvenli",
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
