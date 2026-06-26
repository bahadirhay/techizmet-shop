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
  experimental: {
    // Vercel 8GB build konteynerinde webpack OOM riskini azaltir
    cpus: 1,
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
    // Modern tarayıcı hedefi — Next dahili polyfill modülü (~12 KiB) gereksiz
    if (!isServer) {
      config.resolve.alias["../build/polyfills/polyfill-module"] = false;
      config.resolve.alias["next/dist/build/polyfills/polyfill-module"] = false;
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
    const prebuiltHtmlNoStore = [
      { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
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
      { source: "/api/admin/:path*", headers: [...noStore] },
      { source: "/_mirror-prebuilt/:path*.html", headers: [...prebuiltHtmlNoStore] },
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
