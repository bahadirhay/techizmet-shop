import type { NextConfig } from "next";
import { LEGACY_PRODUCT_REDIRECTS } from "./src/lib/catalog/mirror-catalog";

const legacyProductRedirects = Object.entries(LEGACY_PRODUCT_REDIRECTS).map(([from, to]) => ({
  source: `/products/${from}`,
  destination: `/products/${to}`,
  permanent: true,
}));

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client", "linkedom"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
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
    return [
      { source: "/admin/:path*", headers: [...noStore] },
      { source: "/api/admin/:path*", headers: [...noStore] },
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
