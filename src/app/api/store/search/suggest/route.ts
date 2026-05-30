import { NextResponse } from "next/server";
import { loadMirrorSearchDrawerPayload } from "@/lib/mirror-store-search-server";

/** Tema predictive_search_url uyumluluğu — boş sections (asıl render kn-search-bridge) */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const payload = await loadMirrorSearchDrawerPayload(q);
  return NextResponse.json({
    resources: {
      results: {
        products: payload.products.map((p) => ({
          title: p.title,
          url: `/products/${p.slug}`,
          image: p.imageUrl,
          price: p.priceLabel,
        })),
        collections: payload.collections.map((c) => ({
          title: c.title,
          url: `/collections/${c.slug}`,
          image: c.imageUrl,
        })),
        pages: [],
        articles: [],
      },
    },
  });
}
