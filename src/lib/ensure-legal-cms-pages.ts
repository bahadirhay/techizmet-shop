import { serializeBlocks } from "@/lib/blocks/schema";
import type { ShopBlock } from "@/lib/blocks/schema";
import { prisma } from "@/lib/prisma";

const LEGAL_PAGES: Array<{ slug: string; title: string; blocks: ShopBlock[] }> = [
  {
    slug: "mesafeli-satis",
    title: "Mesafeli Satış Sözleşmesi",
    blocks: [
      {
        type: "text",
        props: {
          align: "left",
          content:
            "İçerik admin panel → Entegrasyon → Mesafeli satış sözleşmesi alanlarından otomatik üretilir.",
        },
      },
    ],
  },
  {
    slug: "kvkk",
    title: "KVKK Aydınlatma Metni",
    blocks: [
      {
        type: "text",
        props: { content: "KVKK Aydınlatma Metni", as: "h1", align: "center" },
      },
      {
        type: "text",
        props: {
          align: "left",
          content:
            "Kişisel verilerinizin işlenmesine ilişkin aydınlatma metnini buradan yayınlayın. Metni admin panel → Sayfalar üzerinden düzenleyebilirsiniz.",
        },
      },
    ],
  },
];

/** Yasal CMS sayfaları — checkout ve footer bağlantıları için */
export async function ensureLegalCmsPages(siteId: string) {
  for (const page of LEGAL_PAGES) {
    await prisma.shopPage.upsert({
      where: { siteId_slug: { siteId, slug: page.slug } },
      create: {
        siteId,
        slug: page.slug,
        title: page.title,
        blocks: serializeBlocks(page.blocks),
        published: true,
      },
      update: { published: true },
    });
  }
}
