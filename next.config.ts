import type { NextConfig } from "next";
import { LEGACY_PRODUCT_REDIRECTS } from "./src/lib/catalog/mirror-catalog";
import { adminContentSecurityPolicy, storeContentSecurityPolicy } from "./src/lib/security/csp";

const legacyProductRedirects = Object.entries(LEGACY_PRODUCT_REDIRECTS).map(([from, to]) => ({
  source: `/products/${from}`,
  destination: `/products/${to}`,
  permanent: true,
}));

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  // Turbopack — Next 16'da varsayılan; webpack config çakışma uyarısını susturur
  turbopack: {},
  experimental: {},
  images: {
    // Modern formatlar: AVIF %50, WebP %30 daha küçük → LCP iyileşir
    formats: ["image/avif", "image/webp"],
    // Mobil-önce responsive genişlikler (ürün kartı, hero, thumbnail)
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [32, 64, 128, 192, 256, 384, 512],
    // Vercel CDN kalite ayarı — AVIF'te 75, WebP'de yeterince keskin
    qualities: [60, 75, 85],
    // 31 gün CDN cache — aynı URL aynı dosyayı döndürür
    minimumCacheTTL: 2678400,
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "linkedom", "html-encoding-sniffer", "@exodus/bytes"],
  // public/ statik CDN'den sunulur; fs ile taranan uploads/brands/cdn pakete girmesin (Vercel 250MB limiti).
  outputFileTracingExcludes: {
    "/*": [
      "public/uploads/**/*",
      "public/brands/**/*",
      "public/theme/techizmet-shop/cdn/**/*",
      ".next/cache/**/*",
      "tmp-*.html",
      "scripts/diag-*.mjs",
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    if (!isServer) {
      // Modern tarayıcı hedefi (chrome≥111) — Next dahili polyfill modülleri gereksiz
      config.resolve.alias["../build/polyfills/polyfill-module"] = false;
      config.resolve.alias["next/dist/build/polyfills/polyfill-module"] = false;
      // polyfill-nomodule.js → <script nomodule> ile IE11 için kopyalanır;
      // browserslist'imiz modern tarayıcılar — bu dosyayı çıktıya ekleme
      config.plugins = (config.plugins ?? []).filter((p: { constructor?: { name?: string }; name?: string }) => {
        const name = p?.constructor?.name ?? p?.name ?? "";
        if (name === "CopyFilePlugin") {
          const hint = (p as Record<string, unknown>).filePath as string | undefined;
          return !hint?.includes("polyfill-nomodule");
        }
        return true;
      });
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/products/:slug.html", destination: "/products/:slug", permanent: true },
      { source: "/collections/:slug.html", destination: "/collections/:slug", permanent: true },
      { source: "/pages/:slug.html", destination: "/pages/:slug", permanent: true },
      { source: "/policies/:slug.html", destination: "/pages/:slug", permanent: true },
      { source: "/blogs/news.html", destination: "/blogs/news", permanent: true },
      {
        source: "/blogs/news/:slug.html",
        destination: "/blogs/news/:slug",
        permanent: true,
      },
      { source: "/en-us/products/:slug", destination: "/products/:slug", permanent: true },
      { source: "/en-us/collections", destination: "/collections", permanent: true },
      { source: "/en-us/collections/:slug", destination: "/collections/:slug", permanent: true },
      { source: "/collections.html", destination: "/collections", permanent: true },
      { source: "/en-us/pages/:slug", destination: "/pages/:slug", permanent: true },
      { source: "/en-us", destination: "/", permanent: false },
      ...legacyProductRedirects,
    ];
  },
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
    ] as const;
    const prebuiltCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ] as const;
    // Prebuilt HTML — içerik client-side patch edildiğinden shell 5dk browser + 24 saat CDN edge'de cache'de kalabilir
    // Revalidation API çağrıldığında CDN cache temizlenir
    const prebuiltHtmlCache = [
      { key: "Cache-Control", value: "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" },
    ] as const;
    /**
     * SEO tarama dosyaları — dinamik route handler'ları varsayılan no-store
     * veriyor; Next 16 ayrıca s-maxage'i strip ediyor. Config seviyesinde set
     * edilen Cache-Control strip edilmez ve Vercel CDN edge'de cache'ler.
     * Böylece mobil Lighthouse robots.txt'i hızlı/zaman aşımısız indirebilir.
     */
    const seoCrawlCache = [
      { key: "Cache-Control", value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" },
    ] as const;
    /**
     * Vitrin RSC shell — edge CDN cache (Faz 1).
     * Next.js dinamik RSC yanıtı tarayıcıya `private, no-store` verir; bu
     * Cache-Control CDN'i engeller. Vercel-CDN-Cache-Control yalnızca edge
     * katmanını yönetir, origin no-store ile çakışmaz (Vercel dokümantasyonu).
     * Host başına ayrı entry → multi-tenant güvenli.
     */
    const storeShellCache = [
      {
        key: "Vercel-CDN-Cache-Control",
        value: "s-maxage=60, stale-while-revalidate=86400",
      },
    ] as const;
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(self)",
      },
    ] as const;
    const storeCsp = {
      key: "Content-Security-Policy",
      value: storeContentSecurityPolicy(),
    } as const;
    const adminCsp = {
      key: "Content-Security-Policy",
      value: adminContentSecurityPolicy(),
    } as const;
    return [
      { source: "/robots.txt", headers: [...seoCrawlCache] },
      { source: "/sitemap.xml", headers: [...seoCrawlCache] },
      { source: "/llms.txt", headers: [...seoCrawlCache] },
      { source: "/admin/:path*", headers: [...noStore, adminCsp, ...securityHeaders] },
      {
        source: "/((?!admin|api).*)",
        headers: [storeCsp, ...securityHeaders],
      },
      { source: "/", headers: [...storeShellCache] },
      { source: "/products/:path*", headers: [...storeShellCache] },
      { source: "/collections", headers: [...storeShellCache] },
      { source: "/collections/:path*", headers: [...storeShellCache] },
      { source: "/blogs/news", headers: [...storeShellCache] },
      { source: "/blogs/news/:path*", headers: [...storeShellCache] },
      { source: "/pages/:path*", headers: [...storeShellCache] },
      { source: "/sokak-dostlari", headers: [...storeShellCache] },
      { source: "/api/admin/:path*", headers: [...noStore] },
      { source: "/_mirror-prebuilt/:path*.html", headers: [...prebuiltHtmlCache] },
      { source: "/_mirror-prebuilt/:path*", headers: [...prebuiltCache] },
      {
        // JS/CSS/images — uzun süreli cache uygun
        source: "/theme/techizmet-shop/mirror/:path((?!.*\\.html).*)",
        headers: [...prebuiltCache],
      },
      {
        // HTML dosyaları — admin değişikliklerinin anında yansıması için kısa cache
        source: "/theme/techizmet-shop/mirror/:path*.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
